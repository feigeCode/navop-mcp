# Dynamic command discovery

All Agent calls include `--json`. Add `--discovery <path>` only when the user or host supplies an explicit discovery file.

The running Navop host is authoritative for tool names, descriptions, annotations, and input schemas:

```bash
navop status --json
navop --help
navop tool list --json
navop tool schema <tool-name> --json
navop tool call <tool-name> --arguments '<json-object-matching-live-schema>' --json
```

Compatibility aliases are available when useful:

```bash
navop tools --json
navop schema <tool-name> --json
navop call <tool-name> --arguments '<json-object>' --json
```

## Representative Bash commands

First discover the connection or session IDs with the live host tools. Replace every placeholder with an ID returned by Navop, and inspect the domain help/schema before executing:

```bash
navop connections list --json
navop connections sessions --json

navop ssh exec \
  --target <ssh-session-id> \
  --command 'uname -a' \
  --json

navop sftp list \
  --connection <ssh-connection-id-or-name> \
  --path /var/log \
  --json

navop redis get \
  --connection-id <redis-connection-id-or-name> \
  --key app:status \
  --json

navop mongo find \
  --connection-id <mongo-session-id> \
  --database app \
  --collection users \
  --filter '{"active":true}' \
  --limit 20 \
  --json

navop db query \
  --connection <database-connection-id-or-name> \
  --sql 'SELECT 1' \
  --json

navop terminal read \
  --target <terminal-session-id> \
  --lines 80 \
  --json
```

These are convenience mappings, not a promise that every host exposes every domain. When a convenience command is absent or does not match the live schema, use `tool list`, `tool schema`, and `tool call`.
