# Safe workflows

## Discover a target

1. Run `navop status --json`.
2. Run `navop tool list --json` and identify a host-provided read-only resource discovery tool.
3. Run `navop tool schema <tool-name> --json`.
4. Call that discovery tool and use only an id returned by Navop.

Never infer an id from a title, hostname, tab label, or earlier conversation.

## Choose an operation

Use the live tool annotations and description returned by `tools/list`. Prefer a tool with `readOnlyHint=true` before a mutating tool. Inspect the live input schema instead of relying on remembered flags or examples.

If a call returns a command, job, or continuation id, discover the matching status/output methods from `tool list`; do not rerun the original mutation merely to retrieve its result.
