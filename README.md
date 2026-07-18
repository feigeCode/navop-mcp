# @navop/mcp

Domain CLI, MCP stdio bridge, and Agent Skill for a running Navop desktop application. Navop remains the implementation, security, permission, approval, session, and audit boundary.

## Executables

```bash
npx -y @navop/mcp@0.1.2 --help
npx -y @navop/mcp@0.1.2 status --json
npx -y @navop/mcp@0.1.2 tools --json
npx -y @navop/mcp@0.1.2 schema <tool> --json
npx -y @navop/mcp@0.1.2 call <tool> --arguments '<json-object>' --json
```

`navop` is the domain CLI. `navop-mcp` is the pure stdio bridge used by MCP clients. `navop mcp` invokes the same bridge behavior through the primary executable.

## Command families

```text
navop status
navop ssh
navop terminal
navop db
navop redis
navop mongo
navop sftp
navop connections
navop workspace
navop functions
navop skill
navop tool
navop mcp
```

The running Navop host is the authority for tool names, descriptions, annotations, schemas, Tool Exposure groups, permissions, and sessions. The package reads `tools/list` and the host-provided `navop.runtime_status`; it does not carry a versioned copy of the complete host tool catalog. Domain command flags are validated against the live MCP schema. The TypeScript package does not implement terminal, database, Redis, MongoDB, SSH/SFTP, or other Navop business behavior.

The exact npm version in generated MCP configuration is the external client/stdio launcher version. It is not the version of the host tool registry. Navop may add or change host tools without publishing this package, as long as the bridge and compatibility contract remain supported.

Use the low-level `navop tool` namespace only for tools that do not yet have a domain command:

```bash
navop tool list --json
navop tool schema <tool> --json
navop tool call <tool> --arguments '<json-object>' --json
```

Compatibility aliases provide the same host-driven operations:

```bash
navop tools --json
navop schema <tool> --json
navop call <tool> --arguments '<json-object>' --json
```

## MCP configuration

```json
{
  "mcpServers": {
    "navop": {
      "command": "npx",
      "args": ["-y", "@navop/mcp@0.1.2", "mcp", "--discovery", "/path/to/navop/public-mcp.json"]
    }
  }
}
```
