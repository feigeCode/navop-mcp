import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("domain CLI discovers the schema and calls the mapped MCP tool", async () => {
  const calls = [];
  const token = "e".repeat(64);
  const server = net.createServer((socket) => serve(socket, token, calls));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const root = await mkdtemp(path.join(os.tmpdir(), "navop-domain-cli-"));
  const discovery = path.join(root, "public-mcp.json");
  await writeFile(discovery, JSON.stringify({ version: 1, app: "navop", pid: 1, host: "127.0.0.1", port: address.port, token, mode: "persistent" }));

  const result = await run(["ssh", "exec", "--target", "ssh-1", "--command", "uname -a", "--discovery", discovery, "--json"]);
  assert.equal(result.code, 0);
  assert.deepEqual(JSON.parse(result.stdout), { ok: true, result: { accepted: true } });
  assert.deepEqual(calls, [{ name: "ssh.exec", arguments: { target: "ssh-1", command: "uname -a" } }]);
  server.close();
});

test("domain CLI reports an unexposed tool without falling back or guessing", async () => {
  const token = "f".repeat(64);
  const server = net.createServer((socket) => serve(socket, token, [], []));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const root = await mkdtemp(path.join(os.tmpdir(), "navop-domain-cli-"));
  const discovery = path.join(root, "public-mcp.json");
  await writeFile(discovery, JSON.stringify({ version: 1, app: "navop", pid: 1, host: "127.0.0.1", port: address.port, token, mode: "persistent" }));
  const result = await run(["db", "query", "--connection", "1", "--sql", "SELECT 1", "--discovery", discovery, "--json"]);
  assert.equal(result.code, 5);
  assert.equal(JSON.parse(result.stdout).code, "tool_not_found");
  server.close();
});

test("leaf help uses the live Navop schema when available", async () => {
  const token = "1".repeat(64);
  const server = net.createServer((socket) => serve(socket, token, []));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const root = await mkdtemp(path.join(os.tmpdir(), "navop-domain-help-"));
  const discovery = path.join(root, "public-mcp.json");
  await writeFile(discovery, JSON.stringify({ version: 1, app: "navop", pid: 1, host: "127.0.0.1", port: address.port, token, mode: "persistent" }));
  const result = await run(["ssh", "exec", "--help", "--discovery", discovery]);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /--target <string>/);
  assert.match(result.stdout, /--command <string>/);
  assert.match(result.stdout, /required/);
  server.close();
});

function serve(socket, token, calls, tools = [sshExecTool()]) {
  let buffer = "";
  socket.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (line === token || !line.startsWith("{")) continue;
      const message = JSON.parse(line);
      if (message.id === undefined) continue;
      if (message.method === "initialize") respond(socket, message.id, { protocolVersion: "2025-11-25", capabilities: {}, serverInfo: { name: "navop", version: "1" } });
      if (message.method === "tools/list") respond(socket, message.id, { tools });
      if (message.method === "tools/call") {
        calls.push(message.params);
        respond(socket, message.id, { structuredContent: { accepted: true }, isError: false });
      }
    }
  });
}

function sshExecTool() {
  return {
    name: "ssh.exec",
    description: "Execute remote command",
    inputSchema: {
      type: "object",
      properties: { target: { type: "string" }, command: { type: "string" } },
      required: ["target", "command"],
    },
  };
}

function respond(socket, id, result) {
  socket.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function run(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.resolve("dist/navop.js"), ...args]);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() }));
  });
}
