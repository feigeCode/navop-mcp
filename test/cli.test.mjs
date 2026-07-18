import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { buildToolArguments, resolveDomainCommand, rootHelp } from "../packages/cli/dist/index.js";

test("navop --help exposes the domain command tree", () => {
  const output = execFileSync(process.execPath, [path.resolve("packages/cli/dist/navop.js"), "--help"], { encoding: "utf8" });
  for (const command of ["ssh", "terminal", "db", "redis", "sftp", "connections", "functions", "skill", "tool"]) {
    assert.match(output, new RegExp(`\\b${command}\\b`));
  }
  assert.equal(output, rootHelp());
});

test("the workspace exposes independent CLI and MCP packages", () => {
  const cliPackage = JSON.parse(readFileSync("packages/cli/package.json", "utf8"));
  const mcpPackage = JSON.parse(readFileSync("packages/mcp/package.json", "utf8"));
  const clientPackage = JSON.parse(readFileSync("packages/client/package.json", "utf8"));
  assert.deepEqual(cliPackage.bin, { navop: "dist/navop.js" });
  assert.deepEqual(mcpPackage.bin, { mcp: "dist/navop-mcp.js", "navop-mcp": "dist/navop-mcp.js" });
  assert.equal(clientPackage.bin, undefined);
  assert.equal(cliPackage.bin.mcp, undefined);
  assert.equal(mcpPackage.bin.navop, undefined);
  assert.ok(cliPackage.files.includes("skills"));
  assert.equal(cliPackage.dependencies["@navop/client"], clientPackage.version);
  assert.equal(mcpPackage.dependencies["@navop/client"], clientPackage.version);
  const cliVersion = execFileSync(process.execPath, [path.resolve("packages/cli/dist/navop.js"), "--version"], { encoding: "utf8" });
  const bridgeVersion = execFileSync(process.execPath, [path.resolve("packages/mcp/dist/navop-mcp.js"), "--version"], { encoding: "utf8" });
  assert.equal(cliVersion.trim(), cliPackage.version);
  assert.equal(bridgeVersion.trim(), mcpPackage.version);
  const output = execFileSync(process.execPath, [path.resolve("packages/mcp/dist/navop-mcp.js"), "--help"], { encoding: "utf8" });
  assert.equal(output, "Usage: navop-mcp [--discovery <path>]\n");
});

test("incomplete domains show help without requiring Navop", () => {
  const output = execFileSync(process.execPath, [path.resolve("packages/cli/dist/navop.js"), "ssh"], { encoding: "utf8" });
  assert.match(output, /Usage: navop ssh <command>/);
  assert.match(output, /exec/);
  assert.match(output, /diagnostics/);
});

test("top-level raw tool compatibility aliases are recognized", () => {
  const result = spawnSync(process.execPath, [path.resolve("packages/cli/dist/navop.js"), "tools"], {
    encoding: "utf8",
  });
  assert.ok([0, 3].includes(result.status), `unexpected exit status: ${result.status}`);
  assert.doesNotMatch(result.stderr, /unknown command/);
  if (result.status === 3) assert.match(result.stderr, /Cannot connect to Navop MCP|Navop MCP discovery is unavailable/);
});

test("domain commands map to actual Navop MCP tool names", () => {
  assert.equal(resolveDomainCommand(["ssh", "exec"]).tool, "ssh.exec");
  assert.equal(resolveDomainCommand(["ssh", "command", "output"]).tool, "ssh.command.output");
  assert.equal(resolveDomainCommand(["terminal", "interrupt"]).tool, "terminal.control");
  assert.equal(resolveDomainCommand(["db", "describe"]).tool, "db.describe_table");
  assert.equal(resolveDomainCommand(["redis", "connections"]).tool, "redis.list_connections");
  assert.equal(resolveDomainCommand(["sftp", "upload"]).tool, "sftp.upload");
  assert.equal(resolveDomainCommand(["connections", "open"]).tool, "connections.open_session");
});

test("schema-driven flags produce typed MCP arguments", () => {
  const schema = {
    type: "object",
    properties: {
      target: { type: "string" },
      lines: { type: "integer" },
      wait_for_output: { type: "boolean" },
      tags: { type: "array", items: { type: "string" } },
    },
    required: ["target"],
  };
  assert.deepEqual(
    buildToolArguments(["--target", "ssh-1", "--lines", "40", "--no-wait-for-output", "--tags", "a", "--tags", "b"], schema),
    { target: "ssh-1", lines: 40, wait_for_output: false, tags: ["a", "b"] },
  );
});

test("schema-driven flags reject unknown and missing arguments", () => {
  const schema = { type: "object", properties: { target: { type: "string" } }, required: ["target"] };
  assert.throws(() => buildToolArguments(["--unknown", "x"], schema), /unknown option/);
  assert.throws(() => buildToolArguments([], schema), /--target/);
});

test("terminal interrupt injects the fixed control action", () => {
  const command = resolveDomainCommand(["terminal", "interrupt"]);
  assert.deepEqual(command.fixedArguments, { action: "interrupt" });
  assert.deepEqual(
    buildToolArguments(
      ["--target", "terminal-1"],
      { type: "object", properties: { target: { type: "string" }, action: { type: "string" } }, required: ["target", "action"] },
      command.fixedArguments,
    ),
    { target: "terminal-1", action: "interrupt" },
  );
});
