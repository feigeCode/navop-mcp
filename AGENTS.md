@/Users/hufei/.codex/RTK.md

## Project rules

- Prefix shell commands with `rtk`.
- Use TDD for CLI, MCP transport, discovery, Skill, and public output contract changes.
- Keep `navop` and `navop-mcp` as independent executable entry points in one npm package.
- Do not implement terminal, SSH, database, Redis, or SFTP business logic in TypeScript; call the authenticated Navop MCP runtime.
- Keep stdout pure MCP data in `navop-mcp` mode.
- Publish only exact package versions and never generate `latest`, wildcard, caret, or tilde launch specifications.
- Run `npm run check`, `npm pack --dry-run`, and clean-install bin verification before release.
