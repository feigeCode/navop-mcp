import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { installSkill, printSkill } from "../packages/cli/dist/index.js";

test("skill has stable frontmatter and installs without silent overwrite", async () => {
  const text = await printSkill();
  assert.match(text, /^---\nname: navop\n/);
  assert.match(text, /Agent.*--json/s);
  assert.match(text, /npm install -g @navop\/cli@latest/);
  assert.match(text, /navop status --json/);
  assert.match(text, /navop db query --help/);
  assert.match(text, /navop db exec --help/);
  assert.match(text, /Read-only statements use `navop db query`/);
  assert.match(text, /DDL, DML, scripts.*use `navop db exec`/);
  assert.match(text, /do not replace it with `navop tool call db\.exec`/);
  assert.match(text, /Do not pass onetcli-only policy flags such as `--allow-write`/);
  assert.match(text, /`tool call` is a low-level fallback, not the default/);
  assert.match(text, /navop tool list --json/);
  assert.match(text, /navop tool schema <tool-name> --json/);
  assert.match(text, /navop tool call <tool-name>/);
  assert.match(text, /npm view @navop\/cli version/);
  assert.match(text, /npm update -g @navop\/cli/);
  assert.match(text, /complete Navop tool catalog/);
  assert.match(text, /reduce repeated tool-definition tokens/);
  assert.match(text, /tools\/list.*authoritative/s);
  assert.doesNotMatch(text, /@navop\/mcp@/);
  assert.doesNotMatch(text, /npx .*@navop\/cli/);
  assert.doesNotMatch(text, /exact-version/);
  assert.doesNotMatch(text, /navop redis get/);
  assert.doesNotMatch(text, /navop mongo find/);
  assert.doesNotMatch(text, /navop sftp read/);

  const home = await mkdtemp(path.join(os.tmpdir(), "navop-skill-"));
  const installed = await installSkill({ target: "codex", scope: "user", home, cwd: home, force: false });
  assert.equal(installed, path.join(home, ".codex", "skills", "navop"));
  assert.match(await readFile(path.join(installed, "SKILL.md"), "utf8"), /name: navop/);
  await assert.rejects(
    installSkill({ target: "codex", scope: "user", home, cwd: home, force: false }),
    (error) => error.code === "skill_exists",
  );
});

test("project agents target installs beneath the current project", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "navop-skill-project-"));
  assert.equal(
    await installSkill({ target: "agents", scope: "project", home: root, cwd: root, force: false }),
    path.join(root, ".agents", "skills", "navop"),
  );
});
