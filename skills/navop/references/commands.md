# Dynamic command discovery

All Agent calls include `--json`. Add `--discovery <path>` only when an explicit discovery file was supplied by the user or host configuration.

The running Navop host is the authority for tool names, descriptions, annotations, and input schemas. This reference intentionally does not enumerate domain-specific tools or arguments.

## Required discovery sequence

```bash
navop status --json
navop --help
navop tool list --json
```

From `tool list`, select the exact tool returned by the host. Read its schema before calling it:

```bash
navop tool schema <tool-name> --json
navop tool call <tool-name> --arguments '<json-object-matching-live-schema>' --json
```

Compatibility aliases are also available:

```bash
navop tools --json
navop schema <tool-name> --json
navop call <tool-name> --arguments '<json-object>' --json
```

## Domain conveniences

`navop --help` may expose domain conveniences. Use them only when present in that installed CLI, then run `navop <domain> <command> --help` to load the live host schema. A missing domain convenience does not mean the host tool is unavailable; use the stable `tool` commands.
