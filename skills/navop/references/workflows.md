# Safe workflows

## Discover a target

1. Run `navop status --json`.
2. Run `navop connections list --json` or `navop connections sessions --json`.
3. Narrow candidates with `connections find/show`.
4. Use the returned id in the domain command.

Never infer an id from a title, hostname, tab label, or earlier conversation.

## SSH automation

Use `navop ssh exec` for Agent-owned remote automation. It runs through Navop's isolated SSH execution path and returns structured output. Use `navop terminal exec` only when the command must use the visible terminal's live cwd, shell environment, aliases, or activated environment.

If `ssh exec` returns a command id after a bounded wait, use `ssh command poll` and `ssh command output`. Do not execute the command again just to retrieve output.

## Database work

Use `db schema/tables/describe/sample/query` before `db exec`. `db query` is read-only. `db exec` may mutate state and remains subject to Navop approval.

## Redis work

Discover the actual Redis connection with `redis connections`. Prefer `keys/get` before `set/command`. Treat `redis command` as potentially mutating unless the command is known to be read-only.

## Remote files

Use `sftp stat/read` before `write/upload/download`. Collision policy defaults to fail. Use overwrite only after the user has authorized replacement or the task clearly requires it.
