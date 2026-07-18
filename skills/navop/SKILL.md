---
name: navop
description: Discover and operate tools exposed by a running Navop desktop application through its host-authoritative MCP schemas and the Navop CLI.
---

# Navop

Use native Navop tools directly when they are already present in the Agent tool list. Otherwise use the `navop` domain CLI. Do not reconnect through the CLI when native Navop tools are available.

Every Agent-initiated CLI command must include `--json`. Start with:

```bash
navop status --json
```

Read the status result before choosing a tool:

- If Public MCP is unavailable, ask the user to start Navop and enable **Settings > General > MCP > MCP Server**.
- Inspect `permissionMode`, `availableTools`, `toolGroups`, `disabledToolGroups`, and `guidance`.
- Treat the running host's `tools/list` response and `navop.runtime_status` result as authoritative. The npm package and this Skill do not define the host's complete tool set.
- If a tool is unavailable, report its exact name and the host-reported tool-group state. Ask the user to enable that group under the `settingsPath` returned by the host and open the required connection/session.
- `deny` mode blocks mutations. `ask` mode requires approval in Navop. `allow` mode runs mutations automatically, but still requires clear user intent for destructive actions.
- Never describe a host capability as enabled merely because the CLI has a command for it; the live `availableTools` list is authoritative.

Discover commands and schemas at runtime before choosing an operation:

```bash
navop --help
navop tool list --json
navop tool schema <tool-name> --json
```

If `navop --help` exposes a suitable domain command, use its `--help`; its flags are validated against the live schema. Otherwise use `navop tool call <tool-name> --arguments '<json-object>' --json`. Never invent a command, tool name, flag, or argument from examples in this Skill.

Discover resource/session methods from `navop tool list --json`, inspect their schemas, and call the applicable read-only discovery method. Never guess a session, connection, database, or other resource identifier. If a name is ambiguous, use an opaque or numeric id returned by Navop.

Prefer reads before writes. Preserve Navop permission and approval decisions. Never work around a denial. Do not retry a mutating operation after timeout or connection loss because its outcome may be unknown. Do not call a host tool that interrupts or controls a visible terminal unless the user explicitly requests that action.

Domain commands are convenience mappings only. `navop tool list/schema/call` is the stable, host-driven interface and remains valid for tools added after this Skill was published.

Read these references as needed:

- [commands.md](references/commands.md): dynamic command and schema discovery.
- [workflows.md](references/workflows.md): safe discovery and execution sequences.
- [safety.md](references/safety.md): approvals, writes, terminal ownership, and retry rules.
- [errors.md](references/errors.md): JSON envelope, exit codes, and recovery behavior.
