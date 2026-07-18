import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { resolveDiscoveryPath, readDiscovery } from "../packages/client/dist/index.js";

const TOKEN = "a".repeat(64);

test("explicit discovery path wins over environment and defaults", async () => {
  const result = await resolveDiscoveryPath("/explicit/public-mcp.json", {
    NAVOP_MCP_DISCOVERY: "/env/navop.json",
  });
  assert.equal(result, "/explicit/public-mcp.json");
});

test("default discovery search only uses the Navop location", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "navop-discovery-"));
  const navop = path.join(root, "navop", "public-mcp.json");

  assert.equal(await resolveDiscoveryPath(undefined, {}, root), navop);
});

test("discovery accepts Navop and rejects legacy or unsafe endpoints", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "navop-discovery-"));
  const file = path.join(root, "navop.json");
  await writeFile(file, JSON.stringify(discovery()));
  assert.equal((await readDiscovery(file)).app, "navop");

  const legacy = path.join(root, "legacy.json");
  await writeFile(legacy, JSON.stringify(discovery({ app: "onetcli" })));
  await assert.rejects(readDiscovery(legacy), /unexpected discovery app/);

  const remote = path.join(root, "remote.json");
  await writeFile(remote, JSON.stringify(discovery({ host: "192.0.2.10" })));
  await assert.rejects(readDiscovery(remote), /loopback/);

  const badToken = path.join(root, "token.json");
  await writeFile(badToken, JSON.stringify(discovery({ token: "secret" })));
  await assert.rejects(readDiscovery(badToken), /token/);
});

function discovery(overrides = {}) {
  return {
    version: 1,
    app: "navop",
    pid: 1,
    host: "127.0.0.1",
    port: 3456,
    token: TOKEN,
    mode: "persistent",
    ...overrides,
  };
}
