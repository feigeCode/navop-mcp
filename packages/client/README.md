# @navop/client

Shared Node.js client library for Navop discovery, authenticated loopback connections, MCP requests, and public error contracts. It is the common transport layer used by `@navop/cli` and `@navop/mcp`; most users should install one of those higher-level packages instead.

The client reads the discovery document published by a running Navop desktop application, connects to its authenticated Public MCP runtime, and preserves the host's tool, permission, approval, session, and audit boundaries. It does not implement Navop resource operations itself.
