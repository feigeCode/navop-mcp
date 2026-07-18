# @navop/mcp

MCP stdio bridge for a running Navop desktop application. This package is intentionally limited to the MCP transport boundary; install `@navop/cli` for terminal commands and the bundled Agent Skill.

Configure an MCP client with the latest bridge launcher:

```bash
npx -y @navop/mcp@latest --discovery /path/to/navop/public-mcp.json
```

The bridge keeps stdout pure MCP JSON-RPC data and writes diagnostics to stderr. It connects through the shared `@navop/client` transport and preserves Navop's authentication, Tool Exposure, permissions, approvals, sessions, results, and audit boundaries.
