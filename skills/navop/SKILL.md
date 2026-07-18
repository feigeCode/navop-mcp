---
name: navop
description: Operate terminal, database, Redis, SSH/SFTP, connections, workspaces, and internal functions exposed by a running Navop desktop application through the Navop CLI.
---

# Navop

Use native Navop tools directly when they are already present in the Agent tool list. Otherwise use the `navop` domain CLI. Do not reconnect through the CLI when native Navop tools are available.

Every Agent-initiated CLI command must include `--json`. Start with:

```bash
navop status --json
```

Read the status result before choosing a tool:

- If Public MCP is unavailable, ask the user to start Navop and enable **Settings > General > MCP > MCP Server**.
- Inspect `permissionMode`, `availableTools`, `unavailableTools`, and `guidance`.
- If a tool is unavailable, tell the user exactly which tool is missing. Ask them to enable its group under **Settings > General > Tool Exposure** and open the relevant SSH, terminal, database, Redis, MongoDB, or SFTP connection/session.
- `deny` mode blocks mutations. `ask` mode requires approval in Navop. `allow` mode runs mutations automatically, but still requires clear user intent for destructive actions.
- Never describe a host capability as enabled merely because the CLI has a command for it; the live `availableTools` list is authoritative.

Use domain commands as the primary interface:

```bash
navop connections list --json
navop ssh exec --target <session-id> --command '<command>' --json
navop terminal read --target <terminal-id> --lines 100 --json
navop db query --connection <id> --sql '<read-only-sql>' --json
navop redis get --connection-id <id> --key <key> --json
navop mongo find --connection-id <id> --database app --collection users --filter '{"active":true}' --json
navop sftp read --connection <id> --path <remote-path> --json
```

Use `navop <domain> --help` and `navop <domain> <command> --help` before assuming flags. The CLI validates flags against the schema exposed by the running Navop application.

Discover real resources before acting. Use `navop connections list/find/show/sessions --json`; never guess a `session_id`, terminal target, connection id, database name, Redis connection id, or path. If a name is ambiguous, use the returned numeric or opaque id.

Prefer reads before writes. Preserve Navop permission and approval decisions. Never work around a denial. Do not retry a mutating operation after timeout or connection loss because its outcome may be unknown. Do not interrupt a visible terminal unless the user explicitly requests it; use only `navop terminal interrupt` for that action.

Use `navop tool` only for a runtime tool that has no domain command. It is a low-level escape hatch, not the normal workflow.

Read these references as needed:

- [commands.md](references/commands.md): complete command families and examples.
- [workflows.md](references/workflows.md): safe discovery and execution sequences.
- [safety.md](references/safety.md): approvals, writes, terminal ownership, and retry rules.
- [errors.md](references/errors.md): JSON envelope, exit codes, and recovery behavior.
