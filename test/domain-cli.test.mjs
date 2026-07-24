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

test("domain CLI re-reads discovery while the Navop runtime is restarting", async () => {
  const calls = [];
  const token = "9".repeat(64);
  const root = await mkdtemp(path.join(os.tmpdir(), "navop-restart-cli-"));
  const discovery = path.join(root, "public-mcp.json");
  const staleServer = net.createServer();
  await new Promise((resolve) => staleServer.listen(0, "127.0.0.1", resolve));
  const stalePort = staleServer.address().port;
  await new Promise((resolve) => staleServer.close(resolve));
  await writeDiscovery(discovery, stalePort, token);

  const command = run(["ssh", "exec", "--target", "ssh-1", "--command", "uname -a", "--discovery", discovery, "--json"]);
  await new Promise((resolve) => setTimeout(resolve, 100));

  const replacement = net.createServer((socket) => serve(socket, token, calls));
  await new Promise((resolve) => replacement.listen(0, "127.0.0.1", resolve));
  await writeDiscovery(discovery, replacement.address().port, token);

  const result = await command;
  assert.equal(result.code, 0, result.stderr || result.stdout);
  assert.deepEqual(JSON.parse(result.stdout), { ok: true, result: { accepted: true } });
  assert.deepEqual(calls, [{ name: "ssh.exec", arguments: { target: "ssh-1", command: "uname -a" } }]);
  replacement.close();
});

test("zero-argument leaf commands execute instead of showing group help", async () => {
  const calls = [];
  const token = "0".repeat(64);
  const tools = [{
    name: "connections.list_sessions",
    description: "List sessions",
    inputSchema: { type: "object", properties: {} },
  }];
  const server = net.createServer((socket) => serve(socket, token, calls, tools));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const root = await mkdtemp(path.join(os.tmpdir(), "navop-zero-arg-cli-"));
  const discovery = path.join(root, "public-mcp.json");
  await writeFile(discovery, JSON.stringify({ version: 1, app: "navop", pid: 1, host: "127.0.0.1", port: address.port, token, mode: "persistent" }));

  const result = await run(["connections", "sessions", "--discovery", discovery, "--json"]);
  assert.equal(result.code, 0);
  assert.deepEqual(JSON.parse(result.stdout), { ok: true, result: { accepted: true } });
  assert.deepEqual(calls, [{ name: "connections.list_sessions", arguments: {} }]);
  server.close();
});

test("domain connection aliases map to the host target field", async () => {
  const calls = [];
  const token = "3".repeat(64);
  const tools = [{
    name: "db.query",
    description: "Query database",
    inputSchema: {
      type: "object",
      properties: { target: { type: "string" }, sql: { type: "string" } },
      required: ["target", "sql"],
    },
  }];
  const server = net.createServer((socket) => serve(socket, token, calls, tools));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const root = await mkdtemp(path.join(os.tmpdir(), "navop-alias-cli-"));
  const discovery = path.join(root, "public-mcp.json");
  await writeFile(discovery, JSON.stringify({ version: 1, app: "navop", pid: 1, host: "127.0.0.1", port: address.port, token, mode: "persistent" }));

  const result = await run(["db", "query", "--connection", "174", "--sql", "SELECT 1", "--discovery", discovery, "--json"]);
  assert.equal(result.code, 0);
  assert.deepEqual(calls, [{ name: "db.query", arguments: { target: "174", sql: "SELECT 1" } }]);
  server.close();
});

test("mongo domain commands only map CLI arguments to Rust-hosted MCP tools", async () => {
  const calls = [];
  const token = "4".repeat(64);
  const tools = [{
    name: "mongo.find",
    description: "Find MongoDB documents",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string" },
        database: { type: "string" },
        collection: { type: "string" },
        filter: { type: "object" },
        limit: { type: "integer" },
      },
      required: ["target", "database", "collection"],
    },
  }];
  const server = net.createServer((socket) => serve(socket, token, calls, tools));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const root = await mkdtemp(path.join(os.tmpdir(), "navop-mongo-cli-"));
  const discovery = path.join(root, "public-mcp.json");
  await writeFile(discovery, JSON.stringify({ version: 1, app: "navop", pid: 1, host: "127.0.0.1", port: address.port, token, mode: "persistent" }));

  const result = await run([
    "mongo", "find",
    "--connection-id", "mongo-1",
    "--database", "app",
    "--collection", "users",
    "--filter", '{"active":true}',
    "--limit", "20",
    "--discovery", discovery,
    "--json",
  ]);

  assert.equal(result.code, 0);
  assert.deepEqual(calls, [{
    name: "mongo.find",
    arguments: {
      target: "mongo-1",
      database: "app",
      collection: "users",
      filter: { active: true },
      limit: 20,
    },
  }]);
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
  const failure = JSON.parse(result.stdout);
  assert.equal(failure.code, "tool_not_found");
  assert.equal(failure.details.requiredTool, "db.query");
  assert.ok(failure.details.actions.some((action) => action.includes("Tool Exposure")));
  server.close();
});

test("status reports live host tools and authoritative runtime tool groups", async () => {
  const token = "2".repeat(64);
  const server = net.createServer((socket) => serve(socket, token, [], [
    sshExecTool(),
    { name: "navop.runtime_status", description: "Runtime status", inputSchema: { type: "object", properties: {} } },
  ]));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const root = await mkdtemp(path.join(os.tmpdir(), "navop-status-cli-"));
  const discovery = path.join(root, "public-mcp.json");
  await writeFile(discovery, JSON.stringify({ version: 1, app: "navop", pid: 1, host: "127.0.0.1", port: address.port, token, mode: "persistent" }));

  const result = await run(["status", "--discovery", discovery, "--json"]);
  assert.equal(result.code, 0);
  const status = JSON.parse(result.stdout).result;
  assert.equal(status.permissionMode, "allow");
  assert.deepEqual(status.availableTools, ["navop.runtime_status", "ssh.exec"]);
  assert.deepEqual(status.disabledToolGroups, [{ id: "database", enabled: false }]);
  assert.equal(status.runtime.toolDiscovery.source, "tools/list");
  assert.equal(status.runtime.toolDiscovery.dynamic, true);
  assert.ok(status.guidance.some((line) => line.includes("running Navop host")));
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
      if (message.method === "initialize") respond(socket, message.id, {
        protocolVersion: "2025-11-25",
        capabilities: {},
        serverInfo: { name: "navop", version: "1" },
        instructions: "Navop Public MCP permission_mode=allow: mutating tools run automatically.",
      });
      if (message.method === "tools/list") respond(socket, message.id, { tools });
      if (message.method === "tools/call") {
        calls.push(message.params);
        if (message.params.name === "navop.runtime_status") {
          respond(socket, message.id, {
            structuredContent: {
              contractVersion: 1,
              toolDiscovery: { source: "tools/list", schemaSource: "tools/list", dynamic: true },
              settingsPath: "Settings > General > Tool Exposure",
              toolGroups: [
                { id: "ssh", enabled: true },
                { id: "database", enabled: false },
              ],
            },
            isError: false,
          });
        } else {
          respond(socket, message.id, { structuredContent: { accepted: true }, isError: false });
        }
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

function writeDiscovery(file, port, token) {
  return writeFile(file, JSON.stringify({
    version: 1,
    app: "navop",
    pid: 1,
    host: "127.0.0.1",
    port,
    token,
    mode: "persistent",
  }));
}

function run(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.resolve("packages/cli/dist/navop.js"), ...args]);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolve({ code, stdout: stdout.trim(), stderr: stderr.trim() }));
  });
}
