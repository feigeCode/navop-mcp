# JSON and errors

Successful `--json` output:

```json
{"ok":true,"result":{}}
```

Failed `--json` output:

```json
{"ok":false,"code":"...","message":"...","details":{}}
```

Exit codes:

- `0`: success
- `2`: invalid CLI arguments or an existing Skill target
- `3`: Navop is not running or Public MCP is unavailable
- `4`: discovery or MCP protocol error
- `5`: requested Navop tool is not exposed
- `6`: tool failure, permission denial, or approval rejection
- `8`: timeout
- `9`: connection closed

Recovery:

- For exit `3`, ask the user to start Navop and enable Public MCP.
- For exit `5`, inspect Navop Tool Exposure settings; do not substitute a different tool silently.
- For exit `6`, report the denial or tool error. Do not bypass it.
- For exits `8` or `9`, retry read-only discovery calls when appropriate. Do not retry mutations automatically.
