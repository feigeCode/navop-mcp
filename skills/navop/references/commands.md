# Navop CLI commands

All Agent calls include `--json`. Add `--discovery <path>` only when an explicit discovery file was supplied by the user or host configuration.

## Runtime

```bash
navop status --json
navop --help
navop ssh --help
navop db query --help
```

## Connections and workspaces

```bash
navop connections list --json
navop connections find --name <exact-name> --json
navop connections show --id <id> --json
navop connections kinds --json
navop connections schema --kind <kind> --json
navop connections validate <schema-driven-flags> --json
navop connections save <schema-driven-flags> --json
navop connections delete --id <id> --json
navop connections test --connection <id-or-name> --json
navop connections open --connection <id-or-name> --json
navop connections sessions --json
navop workspace list --json
navop workspace show --id <id> --json
```

## SSH and visible terminals

```bash
navop ssh diagnostics --session-id <id> --json
navop ssh exec --target <id> --command '<command>' --json
navop ssh command poll --command-id <id> --json
navop ssh command output --command-id <id> --json
navop ssh command cancel --command-id <id> --signal sigint --json
navop terminal read --target <id> --lines 100 --json
navop terminal exec --target <id> --command '<command>' --json
navop terminal interrupt --target <id> --json
```

## Databases

```bash
navop db schema --connection <id-or-name> --json
navop db tables --connection <id-or-name> --database <name> --schema <name> --json
navop db describe --connection <id-or-name> --table <name> --json
navop db sample --connection <id-or-name> --table <name> --limit 20 --json
navop db query --connection <id-or-name> --sql '<read-only-sql>' --json
navop db exec --connection <id-or-name> --sql '<sql-script>' --json
navop db exec --connection <id-or-name> --file <sql-file> --json
```

## Redis

```bash
navop redis connections --json
navop redis keys --connection-id <id> --pattern 'user:*' --json
navop redis get --connection-id <id> --key <key> --json
navop redis set --connection-id <id> --key <key> --value <value> --json
navop redis command --connection-id <id> --command 'TTL user:1' --json
```

## SFTP

```bash
navop sftp list --connection <id-or-name> --path <remote-dir> --json
navop sftp stat --connection <id-or-name> --path <remote-path> --json
navop sftp read --connection <id-or-name> --path <remote-file> --json
navop sftp write --connection <id-or-name> --path <remote-file> --content-file <local-file> --json
printf '%s' '<content>' | navop sftp write --connection <id-or-name> --path <remote-file> --stdin --json
navop sftp upload --connection <id-or-name> --local-path <local> --remote-path <remote> --json
navop sftp download --connection <id-or-name> --remote-path <remote> --local-path <local> --json
```

For write/upload/download collisions, pass the runtime-supported `--on-exists fail|overwrite|skip` value explicitly.

## Internal functions and low-level tools

```bash
navop functions list --json
navop functions call <schema-driven-flags> --json
navop tool list --json
navop tool schema <tool-name> --json
navop tool call <tool-name> --arguments '<json-object>' --json
```
