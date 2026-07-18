import { commandChildren, DOMAIN_COMMANDS } from "./catalog.js";

const DOMAINS: Array<[string, string]> = [
  ["status", "Show Navop runtime and MCP status"],
  ["ssh", "Execute and manage SSH commands"],
  ["terminal", "Operate visible Navop terminals"],
  ["db", "Query and modify databases"],
  ["redis", "Inspect and modify Redis"],
  ["mongo", "Inspect and modify MongoDB"],
  ["sftp", "Operate remote files over SFTP"],
  ["connections", "Discover and manage saved connections"],
  ["workspace", "Inspect Navop workspaces"],
  ["functions", "List and call Navop internal functions"],
  ["skill", "Print or install the Navop Agent Skill"],
  ["tool", "Access a low-level MCP tool"],
  ["mcp", "Run the MCP stdio bridge"],
];

export function rootHelp(): string {
  return `Usage: navop <command> [options]\n\nOperate tools exposed by a running Navop desktop application.\n\nCommands:\n${DOMAINS.map(([name, summary]) => `  ${name.padEnd(16)}${summary}`).join("\n")}\n\nGlobal options:\n  --discovery <path>  Use an explicit discovery file\n  --json              Emit a stable JSON response\n  --timeout <ms>      Set the request timeout\n  -h, --help          Show help\n  -V, --version       Show version\n`;
}

export function commandHelp(path: string[]): string {
  const special = specialHelp(path);
  if (special) return special;
  const children = commandChildren(path);
  const exact = DOMAIN_COMMANDS.find((candidate) => candidate.path.join(" ") === path.join(" "));
  if (exact) {
    return `Usage: navop ${path.join(" ")} [options]\n\n${exact.summary}.\n\nOptions are validated against the schema exposed by the running Navop application.\n  --json              Emit a stable JSON response\n  --discovery <path>  Use an explicit discovery file\n  --timeout <ms>      Set the MCP request timeout\n  -h, --help          Show help\n`;
  }
  const direct = new Map<string, string>();
  for (const candidate of children) {
    const name = candidate.path[path.length];
    if (name) direct.set(name, candidate.summary);
  }
  if (direct.size === 0) return rootHelp();
  return `Usage: navop ${path.join(" ")} <command> [options]\n\nCommands:\n${[...direct].map(([name, summary]) => `  ${name.padEnd(16)}${summary}`).join("\n")}\n`;
}

function specialHelp(path: string[]): string | undefined {
  const key = path.join(" ");
  const values: Record<string, string> = {
    status: "Usage: navop status [--json] [--discovery <path>] [--timeout <ms>]\n",
    skill: "Usage: navop skill print|install [--target codex|agents] [--scope user|project] [--force]\n",
    tool: "Usage: navop tool list|schema <tool>|call <tool> [--arguments <json>|--file <path>|--stdin]\n",
    mcp: "Usage: navop mcp [--discovery <path>]\n",
  };
  return values[key];
}

export function allCommandPaths(): string[] {
  return DOMAIN_COMMANDS.map((command) => command.path.join(" "));
}

export function schemaHelp(path: string[], summary: string, schema: any, fixed: Record<string, unknown> = {}): string {
  const required = new Set<string>(schema.required ?? []);
  const properties = Object.entries<any>(schema.properties ?? {}).filter(([name]) => fixed[name] === undefined);
  const lines = properties.map(([name, property]) => {
    const flag = `--${name.replaceAll("_", "-")}`;
    const type = schemaType(property);
    const marker = required.has(name) ? " (required)" : "";
    const choices = property.enum ? ` [${property.enum.join("|")}]` : "";
    return `  ${`${flag} <${type}>`.padEnd(28)}${property.description ?? ""}${choices}${marker}`.trimEnd();
  });
  return `Usage: navop ${path.join(" ")} [options]\n\n${summary}.\n\nOptions:\n${lines.join("\n")}\n  --json                      Emit a stable JSON response\n  --discovery <path>          Use an explicit discovery file\n  --timeout <ms>              Set the MCP request timeout\n  -h, --help                  Show help\n`;
}

function schemaType(property: any): string {
  const type = Array.isArray(property.type) ? property.type.find((value: string) => value !== "null") : property.type;
  if (type === "integer") return "integer";
  if (type === "number") return "number";
  if (type === "boolean") return "boolean";
  if (type === "array") return property.items?.type ?? "value";
  if (type === "object") return "json";
  return "string";
}
