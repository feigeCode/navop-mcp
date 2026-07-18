import net from "node:net";

import type { DiscoveryDocument } from "./discovery.js";
import { NavopError } from "./errors.js";

const DEFAULT_TIMEOUT_MS = 10_000;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

export class McpConnection {
  private buffer = "";
  private nextId = 1;
  private closed = false;
  private readonly pending = new Map<number, PendingRequest>();

  private constructor(private readonly socket: net.Socket, private readonly timeoutMs: number) {
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => this.receive(chunk));
    socket.on("error", (error) => this.failAll(new NavopError("connection_closed", error.message)));
    socket.on("close", () => this.failAll(new NavopError("connection_closed", "Navop MCP connection closed")));
  }

  static async connect(
    discovery: Pick<DiscoveryDocument, "host" | "port" | "token">,
    options: { timeoutMs?: number; initialize?: boolean } = {},
  ): Promise<McpConnection> {
    const socket = await connectRuntimeSocket(discovery, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const connection = new McpConnection(socket, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    if (options.initialize !== false) await connection.initialize();
    return connection;
  }

  async initialize(): Promise<unknown> {
    const result = await this.request("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "@navop/mcp", version: "0.1.0" },
    });
    this.notify("notifications/initialized");
    return result;
  }

  request(method: string, params?: unknown): Promise<any> {
    if (this.closed) return Promise.reject(new NavopError("connection_closed", "Navop MCP connection closed"));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new NavopError("timeout", `MCP request timed out: ${method}`));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.write({ jsonrpc: "2.0", id, method, ...(params === undefined ? {} : { params }) });
    });
  }

  notify(method: string, params?: unknown): void {
    this.write({ jsonrpc: "2.0", method, ...(params === undefined ? {} : { params }) });
  }

  close(): void {
    this.socket.end();
  }

  private write(message: unknown): void {
    this.socket.write(`${JSON.stringify(message)}\n`);
  }

  private receive(chunk: string): void {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) this.receiveLine(line);
  }

  private receiveLine(line: string): void {
    let message: any;
    try {
      message = JSON.parse(line);
    } catch {
      this.failAll(new NavopError("protocol_error", "Navop MCP returned invalid JSON"));
      return;
    }
    if (typeof message.id !== "number") return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(message.id);
    if (message.error) pending.reject(new NavopError("protocol_error", message.error.message ?? "MCP error", message.error));
    else pending.resolve(message.result);
  }

  private failAll(error: NavopError): void {
    if (this.closed) return;
    this.closed = true;
    for (const request of this.pending.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    this.pending.clear();
  }
}

export async function connectRuntimeSocket(
  discovery: Pick<DiscoveryDocument, "host" | "port" | "token">,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<net.Socket> {
  const socket = await connectSocket(discovery.host, discovery.port, timeoutMs);
  await writeHandshake(socket, discovery.token);
  return socket;
}

function connectSocket(host: string, port: number, timeoutMs: number): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new NavopError("timeout", `Timed out connecting to Navop MCP at ${host}:${port}`));
    }, timeoutMs);
    socket.once("connect", () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(new NavopError("runtime_unavailable", `Cannot connect to Navop MCP at ${host}:${port}`, error.message));
    });
  });
}

function writeHandshake(socket: net.Socket, token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.write(`${token}\n`, (error) => {
      if (error) reject(new NavopError("connection_closed", "Failed to write Navop MCP handshake", error.message));
      else resolve();
    });
  });
}
