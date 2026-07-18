# @navop/cli

Terminal CLI and bundled Agent Skill for operating resources exposed by a running Navop desktop application.

Install the latest published CLI globally, then use the `navop` executable:

```bash
npm install -g @navop/cli@latest
navop --help
navop status --json
```

The CLI discovers live tools and schemas from Navop and calls the authenticated Public MCP runtime. Navop remains authoritative for Tool Exposure, permissions, approvals, connection/session IDs, results, and auditing. SSH, SFTP, terminal, database, Redis, and MongoDB behavior stays in Navop; this package only maps command-line arguments to host schemas.

Check and update the installed client with npm:

```bash
npm view @navop/cli version
npm update -g @navop/cli
navop --version
navop status --json
```

The bundled `navop` Skill requires this global CLI and explains how to keep a compact command workflow in Agent context instead of carrying the complete MCP tool catalog in every turn.
