import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import test from "node:test";

import { runBridge, runBridgeFromDiscovery } from "../packages/mcp/dist/index.js";

test("stdio bridge sends token first and copies bytes in both directions", async () => {
  let received = "";
  const server = net.createServer((socket) => {
    socket.on("data", (chunk) => {
      received += chunk.toString();
      if (received.endsWith("payload")) {
        socket.end("response");
      }
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const input = new PassThrough();
  const output = new PassThrough();
  let response = "";
  output.setEncoding("utf8");
  output.on("data", (chunk) => { response += chunk; });
  const bridge = runBridge({
    version: 1,
    app: "navop",
    pid: 1,
    host: "127.0.0.1",
    port: address.port,
    token: "d".repeat(64),
    mode: "persistent",
  }, input, output);
  input.end("payload");
  await bridge;
  assert.equal(received, `${"d".repeat(64)}\npayload`);
  assert.equal(response, "response");
  server.close();
});

test("stdio bridge re-reads discovery during initial runtime startup", async () => {
  const token = "a".repeat(64);
  const root = await mkdtemp(path.join(os.tmpdir(), "navop-restart-bridge-"));
  const discovery = path.join(root, "public-mcp.json");
  const staleServer = net.createServer();
  await new Promise((resolve) => staleServer.listen(0, "127.0.0.1", resolve));
  const stalePort = staleServer.address().port;
  await new Promise((resolve) => staleServer.close(resolve));
  await writeDiscovery(discovery, stalePort, token);

  const input = new PassThrough();
  const output = new PassThrough();
  let response = "";
  output.setEncoding("utf8");
  output.on("data", (chunk) => { response += chunk; });
  input.end("payload");
  const bridge = runBridgeFromDiscovery(discovery, input, output);
  await new Promise((resolve) => setTimeout(resolve, 100));

  let received = "";
  const replacement = net.createServer((socket) => {
    socket.on("data", (chunk) => {
      received += chunk.toString();
      if (received.endsWith("payload")) socket.end("response");
    });
  });
  await new Promise((resolve) => replacement.listen(0, "127.0.0.1", resolve));
  await writeDiscovery(discovery, replacement.address().port, token);

  await bridge;
  assert.equal(received, `${token}\npayload`);
  assert.equal(response, "response");
  replacement.close();
});

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
