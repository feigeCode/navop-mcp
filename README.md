# @navop/mcp

Official MCP stdio bridge, host-driven CLI, and Agent Skill for a running [Navop](https://github.com/feigeCode/navop) desktop application.

`@navop/mcp` lets external MCP clients, terminal users, Codex, Claude, and other Agents operate capabilities exposed by Navop. Navop remains the only implementation, security, permission, approval, connection/session, and audit boundary. This package does not reimplement terminal, SSH/SFTP, database, Redis, MongoDB, or other Navop business logic in TypeScript.

## Highlights

- MCP stdio bridge: `navop mcp` or `navop-mcp`.
- Domain CLI for SSH, visible terminals, databases, Redis, MongoDB, SFTP, connections, workspaces, and internal functions.
- Stable low-level CLI that discovers all tools and schemas from the running host.
- Host-authoritative Tool Exposure and permission diagnostics.
- Stable JSON success/error envelopes and documented exit codes.
- Installable `navop` Agent Skill for Codex and Agents-compatible clients.
- New and legacy Navop/onetcli discovery compatibility during migration.
- No global npm installation required; use an exact version through `npx`.

## Requirements

- Node.js 20 or newer.
- A running Navop desktop application.
- **Settings > General > MCP > MCP Server** enabled in Navop.
- The required groups enabled under **Settings > General > Tool Exposure**.
- Any connection or terminal session required by the selected tool opened in Navop.

## Quick start

Use an exact package version for reproducible execution:

```bash
npx -y @navop/mcp@0.1.2 --help
npx -y @navop/mcp@0.1.2 status --json
npx -y @navop/mcp@0.1.2 tools --json
npx -y @navop/mcp@0.1.2 schema <tool-name> --json
npx -y @navop/mcp@0.1.2 call <tool-name> --arguments '<json-object>' --json
```

The npm version identifies the external client, CLI, Skill, and stdio launcher. It is not the version of Navop's host tool registry. Navop can add or change tools without requiring a package release as long as the client compatibility contract remains supported.

## Executables

The package exposes three npm bins:

| Executable | Purpose |
| --- | --- |
| `navop` | Primary domain and low-level CLI. |
| `navop-mcp` | Pure MCP stdio-to-Navop bridge. |
| `mcp` | Scoped-package default launcher so `npx @navop/mcp ...` works directly. |

The following bridge commands are equivalent:

```bash
navop mcp
navop-mcp
npx -y @navop/mcp@0.1.2 mcp
```

In MCP mode, stdout is reserved exclusively for the MCP JSON-RPC stream. Diagnostics are written to stderr.

## Host-authoritative discovery

The running Navop host is the authority for:

- tool names and descriptions;
- input schemas;
- read-only, destructive, idempotent, and open-world annotations;
- enabled Tool Exposure groups;
- permission mode;
- connections, sessions, and resource identifiers;
- tool results and business errors.

The CLI obtains this data from:

1. MCP `initialize` for the current permission mode and protocol metadata;
2. MCP `tools/list` for the actual available tools, schemas, and annotations;
3. `navop.runtime_status` for the host compatibility contract and Tool Exposure group states.

`@navop/mcp` does not maintain a versioned copy of the complete host tool catalog. Domain commands are convenience mappings; the low-level discovery interface remains available for tools added after this package version was published.

```bash
navop status --json
navop tool list --json
navop tool schema <tool-name> --json
navop tool call <tool-name> --arguments '<json-object>' --json
```

Compatibility aliases provide the same host-driven operations:

```bash
navop tools --json
navop schema <tool-name> --json
navop call <tool-name> --arguments '<json-object>' --json
```

Always inspect the live schema before assuming arguments:

```bash
navop schema db.query --json
navop db query --help
```

## Current capability overview

The current CLI includes convenience commands for the following capability families. Availability at runtime depends on the Navop version, Tool Exposure settings, and active connections/sessions. Run `navop tools --json` for the authoritative list.

| Capability | Current convenience commands |
| --- | --- |
| Runtime diagnostics | `navop status`, `navop tools`, `navop schema`, `navop call` |
| SSH execution | execute, inspect session diagnostics, poll/read/cancel tracked commands |
| Visible terminal | read output, execute in the visible PTY, explicitly interrupt |
| SQL databases | schema, tables, table description, sample rows, read-only query, write-capable script execution |
| Redis | active connections, arbitrary command, keys, get, set |
| MongoDB | databases, collections, find, aggregate, count, indexes, validation, document CRUD, explain |
| SFTP | list, stat, read, write, upload, download |
| Saved connections | list, find, show, kinds, schema, validate, save, delete, test, open, sessions |
| Workspaces | list and show |
| Internal functions | list host functions and call a function using its live schema |
| Agent Skill | print or install the bundled host-driven Skill |
| MCP bridge | stdio bridge to the authenticated loopback Navop runtime |

### SSH

```text
navop ssh exec
navop ssh diagnostics
navop ssh command poll
navop ssh command output
navop ssh command cancel
```

`ssh exec` uses Navop's isolated SSH execution path and returns structured output. It does not silently inherit the visible terminal's current working directory, activated environment, aliases, or temporary shell variables unless explicitly supplied through the live tool schema.

### Visible terminal

```text
navop terminal read
navop terminal exec
navop terminal interrupt
```

Visible-terminal operations act on a Navop terminal session. Use `terminal interrupt` only when the user explicitly requests interruption of the visible foreground process.

### SQL databases

```text
navop db schema
navop db tables
navop db describe
navop db sample
navop db query
navop db exec
```

`db query` is read-only. `db exec` can mutate data and remains subject to the current Navop permission and approval mode. Database behavior and supported engines come from the running Navop host.

### Redis

```text
navop redis connections
navop redis command
navop redis keys
navop redis get
navop redis set
```

Redis commands operate against active Redis resources owned by Navop. Discover the live connection identifier before calling a Redis operation.

### MongoDB

```text
navop mongo connections
navop mongo databases
navop mongo collections
navop mongo find
navop mongo aggregate
navop mongo count
navop mongo indexes
navop mongo index create
navop mongo index drop
navop mongo collection create
navop mongo database drop
navop mongo validation get
navop mongo validation set
navop mongo insert
navop mongo replace
navop mongo update
navop mongo delete
navop mongo explain
```

MongoDB document arguments use JSON/MongoDB Extended JSON and are converted to BSON by the Rust host. The TypeScript CLI only maps arguments to the schema exposed by Navop.

### SFTP

```text
navop sftp list
navop sftp read
navop sftp write
navop sftp stat
navop sftp upload
navop sftp download
```

SFTP write, upload, and download operations do not silently overwrite a target. Use the collision policy accepted by the live schema and only authorize replacement when intended.

### Connections and sessions

```text
navop connections list
navop connections show
navop connections find
navop connections kinds
navop connections schema
navop connections validate
navop connections save
navop connections delete
navop connections test
navop connections open
navop connections sessions
```

Use connection discovery methods before domain operations. Never guess a connection or session identifier. Secrets are redacted from structured connection responses.

### Workspaces and internal functions

```text
navop workspace list
navop workspace show
navop functions list
navop functions call
```

Internal functions are supplied by the running host. Call `functions list` first, then inspect the returned function schema before invoking it.

## Status and Tool Exposure

`navop status --json` combines discovery, initialize, `tools/list`, and `navop.runtime_status`:

```json
{
  "ok": true,
  "result": {
    "running": true,
    "permissionMode": "allow",
    "toolCount": 39,
    "availableTools": ["navop.runtime_status", "ssh.exec"],
    "runtime": {
      "contractVersion": 1,
      "toolDiscovery": {
        "source": "tools/list",
        "schemaSource": "tools/list",
        "dynamic": true
      },
      "settingsPath": "Settings > General > Tool Exposure"
    },
    "toolGroups": [
      { "id": "ssh", "enabled": true },
      { "id": "mongodb", "enabled": false }
    ],
    "disabledToolGroups": [
      { "id": "mongodb", "enabled": false }
    ]
  }
}
```

When a requested tool is unavailable, the CLI reports the exact missing tool, the associated host group, the host-reported group state, and the settings/session actions needed to make it available.

## Permission modes

Navop owns all permission and approval decisions:

| Mode | Behavior |
| --- | --- |
| `deny` | Mutating tools are denied. Read-only discovery remains available. |
| `ask` | Mutating tools require approval in Navop. A rejection is final for that attempt. |
| `allow` | Mutating tools run automatically, but callers must still confirm user intent before destructive actions. |

The CLI and Skill never bypass a denial or approval rejection.

## MCP client configuration

Use an exact npm version in managed MCP configuration:

```json
{
  "mcpServers": {
    "navop": {
      "command": "npx",
      "args": [
        "-y",
        "@navop/mcp@0.1.2",
        "mcp",
        "--discovery",
        "/path/to/navop/public-mcp.json"
      ]
    }
  }
}
```

Navop can install and inspect managed Codex and Claude Code entries from its MCP settings page. Managed configuration uses an exact package version rather than `latest`, `*`, `^`, or `~`.

The bridge connects only to the authenticated loopback runtime described by the discovery file. It validates:

- a loopback host;
- a valid TCP port;
- a 64-character hexadecimal token;
- the supported discovery app/schema;
- the live Navop process/discovery state.

The token is sent as the first line of the TCP connection and is never printed in normal CLI output.

## Discovery resolution

The client searches discovery configuration in this order:

1. `--discovery <path>`;
2. `NAVOP_MCP_DISCOVERY`;
3. `ONETCLI_MCP_DISCOVERY` for migration compatibility;
4. the default Navop config path;
5. the legacy onetcli config path.

Both `app: "navop"` and the legacy `app: "onetcli"` are accepted during the compatibility window. New installations should use Navop paths and environment variables.

## Agent Skill

Print the bundled Skill:

```bash
navop skill print
```

Install it for Codex or an Agents-compatible client:

```bash
navop skill install --target codex --scope user
navop skill install --target agents --scope user
navop skill install --target codex --scope project
navop skill install --target agents --scope project
```

Default destinations:

| Target | User scope | Project scope |
| --- | --- | --- |
| Codex | `~/.codex/skills/navop` | `.codex/skills/navop` |
| Agents | `~/.agents/skills/navop` | `.agents/skills/navop` |

Existing Skill directories are not silently overwritten. Use `--force` only for an explicit update.

The Skill intentionally does not enumerate Navop business tools or their arguments. It instructs an Agent to discover capabilities from:

```bash
navop status --json
navop tool list --json
navop tool schema <tool-name> --json
```

It also instructs the Agent to prefer native Navop tools when already available, discover real resource ids, prefer reads before writes, preserve approval semantics, and avoid retrying mutations after timeout or connection loss.

## JSON output contract

All Agent-initiated CLI calls should include `--json`.

Successful response:

```json
{
  "ok": true,
  "result": {}
}
```

Failed response:

```json
{
  "ok": false,
  "code": "tool_not_found",
  "message": "Navop tool is not available from the running host",
  "details": {}
}
```

## Exit codes

| Exit code | Meaning |
| ---: | --- |
| `0` | Success. |
| `2` | Invalid CLI arguments or an existing Skill target. |
| `3` | Navop is not running or Public MCP is unavailable. |
| `4` | Discovery or MCP protocol error. |
| `5` | The requested host tool is unavailable or not exposed. |
| `6` | Tool failure, permission denial, or approval rejection. |
| `8` | Request timeout. |
| `9` | Connection closed before completion. |

Read-only discovery operations can be retried when appropriate. Mutating operations are never automatically retried after timeout or connection loss because their result may be unknown.

## Safety model

- Navop is the sole tool implementation and security boundary.
- The npm package never connects to arbitrary remote MCP endpoints; discovery must resolve to loopback.
- The discovery token is never included in status or tool output.
- Tool Exposure and permission modes are enforced by Navop.
- Approval rejection is preserved and never bypassed.
- Agents must discover rather than guess connection/session identifiers.
- Visible-terminal interruption requires explicit user intent.
- Mutations are not automatically retried after timeout or disconnect.
- Skill and file targets are not silently overwritten.

## Development

```bash
npm ci
npm run typecheck
npm test
npm run check
npm pack --dry-run
```

The published package runs compiled JavaScript from `dist`; it does not require `ts-node`, `tsx`, or TypeScript at runtime.

## License

MIT
