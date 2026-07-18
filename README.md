# @navop/mcp

Domain CLI, MCP stdio bridge, and Agent Skill for a running Navop desktop application. Navop remains the implementation, security, permission, approval, session, and audit boundary.

## Executables

```bash
npx -y @navop/mcp@0.1.0 --help
npx -y @navop/mcp@0.1.0 status --json
npx -y @navop/mcp@0.1.0 ssh exec --target <session> --command 'uname -a' --json
npx -y @navop/mcp@0.1.0 db query --connection <id> --sql 'SELECT 1' --json
npx -y @navop/mcp@0.1.0 redis get --connection-id <id> --key <key> --json
npx -y @navop/mcp@0.1.0 sftp read --connection <id> --path /etc/hosts --json
```

`navop` is the domain CLI. `navop-mcp` is the pure stdio bridge used by MCP clients. `navop mcp` invokes the same bridge behavior through the primary executable.

## Command families

```text
navop status
navop ssh
navop terminal
navop db
navop redis
navop sftp
navop connections
navop workspace
navop functions
navop skill
navop tool
navop mcp
```

Domain command flags are validated against the live MCP tool schema exposed by Navop. The TypeScript package does not implement SSH, terminal, database, Redis, or SFTP behavior.

Use the low-level `navop tool` namespace only for tools that do not yet have a domain command:

```bash
navop tool list --json
navop tool schema <tool> --json
navop tool call <tool> --arguments '<json-object>' --json
```

## MCP configuration

```json
{
  "mcpServers": {
    "navop": {
      "command": "npx",
      "args": ["-y", "@navop/mcp@0.1.0", "mcp", "--discovery", "/path/to/navop/public-mcp.json"]
    }
  }
}
```
