# Navop JavaScript packages

This repository publishes three focused packages for integrating with a running [Navop](https://github.com/feigeCode/navop) desktop application:

| Package | Role | Executable |
| --- | --- | --- |
| `@navop/client` | Shared discovery and authenticated MCP transport | none |
| `@navop/cli` | Terminal commands and bundled Agent Skill | `navop` |
| `@navop/mcp` | MCP stdio bridge | `mcp`, `navop-mcp` |

There is no compatibility burden from the former combined package in this baseline release. Keep the layers separate: use the CLI/Skill when an AI Agent should operate Navop through terminal commands, and use the MCP package when an MCP client needs a stdio bridge.

## Requirements

- Node.js 20 or newer.
- A running Navop desktop application.
- **Settings > General > MCP > MCP Server** enabled in Navop.
- The required groups enabled under **Settings > General > Tool Exposure**.
- Any connection or terminal session required by the selected operation opened in Navop.

## CLI and Skill

The Skill keeps a compact workflow in the Agent context. It discovers status, command help, and live schemas only when needed instead of registering the complete MCP tool catalog on every turn. This can reduce repeated context and tool-definition Token overhead; the result depends on the client and exposed tool count. The CLI still uses Navop's authenticated loopback Public MCP runtime, so host-controlled Tool Exposure, permissions, approvals, sessions, results, and auditing remain in force.

```bash
npm install -g @navop/cli@latest
navop --help
navop status --json
navop connections list --json
navop tool list --json
navop tool schema <tool-name> --json
```

Prefer the domain commands listed by `navop --help`. `navop tool call` is the low-level fallback for a host tool that has no matching domain command.

Representative resource commands use IDs returned by Navop:

```bash
navop ssh exec --target <ssh-session-id> --command 'uname -a' --json
navop sftp list --connection <ssh-connection-id-or-name> --path /var/log --json
navop redis get --connection-id <redis-connection-id-or-name> --key app:status --json
navop mongo find --connection-id <mongo-session-id> --database app --collection users --filter '{"active":true}' --limit 20 --json
navop db query --connection <database-connection-id-or-name> --sql 'SELECT 1' --json
navop db exec --connection <database-connection-id-or-name> --database app --sql 'CREATE TABLE IF NOT EXISTS example (id BIGINT PRIMARY KEY)' --json
navop terminal read --target <terminal-session-id> --lines 80 --json
```

Use `db query` for read-only SQL and `db exec` for DDL, DML, scripts, and other write-capable SQL. Do not substitute `navop tool call db.exec` when `navop db exec` is available. Mutation permission and approval are controlled by the running Navop host.

For a tool without a domain command:

```bash
navop tool call <tool-name> --arguments '<json-object-matching-live-schema>' --json
```

The CLI is a global command. Check the registry and update the installed package when needed:

```bash
npm view @navop/cli version
navop --version
npm update -g @navop/cli
navop status --json
```

## MCP bridge

Use `@navop/mcp` when the consuming client expects an MCP stdio server. The bridge has no domain CLI and emits only MCP JSON-RPC on stdout:

```bash
npx -y @navop/mcp@latest --discovery /path/to/navop/public-mcp.json
```

## Host authority

The running Navop host defines the available tools, schemas, annotations, Tool Exposure groups, permission mode, connections, sessions, resource identifiers, results, and business errors. These packages do not carry a static copy of the complete host catalog and do not bypass host security boundaries.
