import { readFile } from "node:fs/promises";

import { buildToolArguments } from "./arguments.js";
import { commandChildren, resolveDomainCommand } from "./catalog.js";
import { McpConnection, NavopError, readDiscovery, resolveDiscoveryPath } from "@navop/client";
import { commandHelp, rootHelp, schemaHelp } from "./help.js";
import { installSkill, printSkill } from "./skill.js";

interface GlobalOptions {
  json: boolean;
  discovery?: string;
  timeoutMs?: number;
}

const CONNECTION_ATTEMPTS = 5;
const CONNECTION_RETRY_DELAY_MS = 75;

export async function runCli(argv: string[]): Promise<{ result?: unknown; text?: string; json: boolean }> {
  const { args, options } = parseGlobalOptions(argv);
  if (args.length === 0) return { text: rootHelp(), json: false };
  if (hasHelp(args)) return { text: await helpFor(args, options), json: false };
  if (args[0] === "status") return { result: await status(options), json: options.json };
  if (args[0] === "tools") return { result: await toolCommand(["list", ...args.slice(1)], options), json: options.json };
  if (args[0] === "schema") return { result: await toolCommand(["schema", ...args.slice(1)], options), json: options.json };
  if (args[0] === "call") return { result: await toolCommand(["call", ...args.slice(1)], options), json: options.json };
  if (args[0] === "skill") return { result: await skillCommand(args.slice(1)), json: options.json };
  if (args[0] === "tool") return { result: await toolCommand(args.slice(1), options), json: options.json };
  if (
    args.every((value) => !value.startsWith("--"))
    && commandChildren(args).some((candidate) => candidate.path.length > args.length)
  ) {
    return { text: commandHelp(args), json: false };
  }
  return { result: await domainCommand(args, options), json: options.json };
}

async function domainCommand(args: string[], options: GlobalOptions): Promise<unknown> {
  const flagIndex = args.findIndex((value) => value.startsWith("--"));
  const commandTokens = flagIndex < 0 ? args : args.slice(0, flagIndex);
  let toolArgs = flagIndex < 0 ? [] : args.slice(flagIndex);
  const command = resolveDomainCommand(commandTokens);
  const connection = await openConnection(options);
  try {
    const tool = await findTool(connection, command.tool);
    toolArgs = await expandConvenienceArguments(command.tool, toolArgs);
    const parsed = buildToolArguments(toolArgs, tool.inputSchema ?? {}, command.fixedArguments);
    return callTool(connection, command.tool, parsed);
  } finally {
    connection.close();
  }
}

async function status(options: GlobalOptions): Promise<unknown> {
  const discoveryPath = await resolveDiscoveryPath(options.discovery);
  const { discovery, connection, server } = await openConnectionAtPath(discoveryPath, options);
  try {
    const tools = await listTools(connection);
    const availableTools = tools.map((tool) => String(tool.name)).sort();
    const runtime = await runtimeStatus(connection, tools);
    const permissionMode = permissionModeFromServer(server);
    const toolGroups = Array.isArray(runtime?.toolGroups) ? runtime.toolGroups : [];
    const disabledToolGroups = toolGroups.filter((group: any) => group?.enabled === false);
    return {
      running: true,
      discovery: { path: discoveryPath, app: discovery.app, pid: discovery.pid, host: discovery.host, port: discovery.port, mode: discovery.mode },
      server,
      toolCount: tools.length,
      permissionMode,
      availableTools,
      runtime: runtime ?? null,
      toolGroups,
      disabledToolGroups,
      guidance: capabilityGuidance(permissionMode, disabledToolGroups),
    };
  } finally {
    connection.close();
  }
}

async function toolCommand(args: string[], options: GlobalOptions): Promise<unknown> {
  const action = args[0];
  const connection = await openConnection(options);
  try {
    if (action === "list") return listTools(connection);
    const name = args[1];
    if (!name) throw new NavopError("invalid_arguments", `navop tool ${action ?? ""} requires a tool name`);
    if (action === "schema") return findTool(connection, name);
    if (action === "call") {
      await findTool(connection, name);
      return callTool(connection, name, await rawArguments(args.slice(2)));
    }
    throw new NavopError("invalid_arguments", "Usage: navop tool list|schema <tool>|call <tool>");
  } finally {
    connection.close();
  }
}

async function skillCommand(args: string[]): Promise<unknown> {
  if (args[0] === "print") return { content: await printSkill() };
  if (args[0] !== "install") throw new NavopError("invalid_arguments", "Usage: navop skill print|install");
  const options = simpleOptions(args.slice(1));
  const target = options.get("target") ?? "codex";
  const scope = options.get("scope") ?? "user";
  if (target !== "codex" && target !== "agents") throw new NavopError("invalid_arguments", "--target must be codex or agents");
  if (scope !== "user" && scope !== "project") throw new NavopError("invalid_arguments", "--scope must be user or project");
  return { path: await installSkill({ target, scope, force: options.has("force") }) };
}

async function openConnection(options: GlobalOptions): Promise<McpConnection> {
  const discoveryPath = await resolveDiscoveryPath(options.discovery);
  return (await openConnectionAtPath(discoveryPath, options)).connection;
}

async function openConnectionAtPath(
  discoveryPath: string,
  options: GlobalOptions,
): Promise<{
  discovery: Awaited<ReturnType<typeof readDiscovery>>;
  connection: McpConnection;
  server: unknown;
}> {
  let lastError: unknown;
  for (let attempt = 0; attempt < CONNECTION_ATTEMPTS; attempt += 1) {
    let connection: McpConnection | undefined;
    try {
      const discovery = await readDiscovery(discoveryPath);
      connection = await McpConnection.connect(discovery, { ...timeoutOption(options), initialize: false });
      const server = await connection.initialize();
      return { discovery, connection, server };
    } catch (error) {
      connection?.close();
      lastError = error;
      if (attempt + 1 >= CONNECTION_ATTEMPTS || !isRetryableStartupError(error)) throw error;
      await delay(CONNECTION_RETRY_DELAY_MS * 2 ** attempt);
    }
  }
  throw lastError;
}

function isRetryableStartupError(error: unknown): boolean {
  if (!(error instanceof NavopError)) return false;
  if (error.code === "connection_closed") return true;
  if (error.code !== "runtime_unavailable") return false;
  if (!error.details || typeof error.details !== "object") return true;
  return (error.details as { retryable?: unknown }).retryable !== false;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function timeoutOption(options: GlobalOptions): { timeoutMs?: number } {
  return options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs };
}

async function listTools(connection: McpConnection): Promise<any[]> {
  const tools: any[] = [];
  let cursor: string | undefined;
  do {
    const result = await connection.request("tools/list", cursor ? { cursor } : {});
    tools.push(...(result.tools ?? []));
    cursor = result.nextCursor;
  } while (cursor);
  return tools;
}

async function findTool(connection: McpConnection, name: string): Promise<any> {
  const tools = await listTools(connection);
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) {
    const runtime = await runtimeStatus(connection, tools);
    const groupId = toolGroupForName(name);
    const group = Array.isArray(runtime?.toolGroups)
      ? runtime.toolGroups.find((candidate: any) => candidate?.id === groupId)
      : undefined;
    const groupAction = group?.enabled === false
      ? `Enable the ${groupId} tool group in ${runtime?.settingsPath ?? "Navop Settings > General > Tool Exposure"}`
      : `Inspect ${runtime?.settingsPath ?? "Navop Settings > General > Tool Exposure"} and the required connection/session`;
    throw new NavopError(
      "tool_not_found",
      `Navop tool is not available from the running host: ${name}. ${groupAction}, then retry discovery.`,
      {
        requiredTool: name,
        requiredToolGroup: groupId,
        toolGroup: group ?? null,
        availableTools: tools.map((candidate) => candidate.name).sort(),
        actions: [
          "Enable MCP Server in Navop Settings > General > MCP",
          groupAction,
          "Open the connection or session required by the requested tool",
          "Run navop status --json and navop tool list --json again",
        ],
      },
    );
  }
  return tool;
}

async function runtimeStatus(connection: McpConnection, tools: any[]): Promise<any | undefined> {
  if (!tools.some((tool) => tool?.name === "navop.runtime_status")) return undefined;
  const result = await connection.request("tools/call", {
    name: "navop.runtime_status",
    arguments: {},
  });
  if (result?.isError) return undefined;
  return result?.structuredContent ?? result;
}

function toolGroupForName(name: string): string {
  const prefix = name.split(".", 1)[0] ?? name;
  if (prefix === "ssh") return "ssh";
  if (prefix === "terminal") return "terminal_exec";
  if (prefix === "db") return "database";
  if (prefix === "mongo" || prefix === "mongodb") return "mongodb";
  if (prefix === "internal_functions" || prefix === "functions") return "internal_functions";
  return prefix;
}

function permissionModeFromServer(server: any): "deny" | "ask" | "allow" | "unknown" {
  const instructions = typeof server?.instructions === "string" ? server.instructions : "";
  const match = instructions.match(/permission_mode=(deny|ask|allow)/);
  return (match?.[1] as "deny" | "ask" | "allow" | undefined) ?? "unknown";
}

function capabilityGuidance(permissionMode: string, disabledToolGroups: any[]): string[] {
  const guidance = [
    "Tool names and schemas come from the running Navop host through tools/list; the CLI and Skill are not capability authorities.",
    "Tool availability also depends on Navop Tool Exposure settings and active connection sessions.",
  ];
  if (disabledToolGroups.length > 0) {
    guidance.push(
      `Disabled host tool groups: ${disabledToolGroups.map((group: any) => group.id).join(", ")}. Enable only the groups needed by the user.`,
    );
  }
  if (permissionMode === "deny") guidance.push("Mutating tools are denied by the current permission mode.");
  else if (permissionMode === "ask") guidance.push("Mutating tools require approval in Navop; never bypass a rejection.");
  else if (permissionMode === "allow") guidance.push("Mutating tools run automatically; confirm user intent before destructive actions.");
  else guidance.push("Inspect the Navop MCP permission profile before attempting mutations.");
  return guidance;
}

async function callTool(connection: McpConnection, name: string, args: Record<string, unknown>): Promise<unknown> {
  const result = await connection.request("tools/call", { name, arguments: args });
  if (result?.isError) throw new NavopError("tool_failed", toolMessage(result), result);
  return result?.structuredContent ?? result;
}

function parseGlobalOptions(argv: string[]): { args: string[]; options: GlobalOptions } {
  const args: string[] = [];
  const options: GlobalOptions = { json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;
    if (token === "--json") options.json = true;
    else if (token === "--discovery") options.discovery = requiredValue(argv, ++index, token);
    else if (token === "--timeout") options.timeoutMs = positiveInteger(requiredValue(argv, ++index, token), token);
    else args.push(token);
  }
  return { args, options };
}

async function helpFor(args: string[], options: GlobalOptions): Promise<string> {
  const path = args.filter((value) => value !== "--help" && value !== "-h");
  if (path.length === 0) return rootHelp();
  let command;
  try { command = resolveDomainCommand(path); } catch { return commandHelp(path); }
  try {
    const connection = await openConnection(options);
    try {
      const tool = await findTool(connection, command.tool);
      return schemaHelp(path, command.summary, tool.inputSchema ?? {}, command.fixedArguments);
    } finally { connection.close(); }
  } catch { return commandHelp(path); }
}

function hasHelp(args: string[]): boolean {
  return args.includes("--help") || args.includes("-h");
}

async function expandConvenienceArguments(tool: string, args: string[]): Promise<string[]> {
  let expanded = args;
  if (tool.startsWith("db.") || tool.startsWith("sftp.")) {
    expanded = replaceFlagAlias(expanded, "--connection", "--target");
  }
  if (tool.startsWith("redis.")) {
    expanded = replaceFlagAlias(expanded, "--connection-id", "--target");
  }
  if (tool.startsWith("mongo.")) {
    expanded = replaceFlagAlias(expanded, "--connection-id", "--target");
  }
  if (tool !== "sftp.write") return expanded;
  const stdinIndex = expanded.indexOf("--stdin");
  const fileIndex = expanded.indexOf("--content-file");
  if (stdinIndex >= 0 && fileIndex >= 0) throw new NavopError("invalid_arguments", "use only one of --stdin or --content-file");
  if (stdinIndex >= 0) return replaceWithContent(expanded, stdinIndex, 1, await readStdin());
  if (fileIndex >= 0) return replaceWithContent(expanded, fileIndex, 2, await readFile(requiredValue(expanded, fileIndex + 1, "--content-file")));
  return expanded;
}

function replaceFlagAlias(args: string[], alias: string, canonical: string): string[] {
  const aliasIndex = args.indexOf(alias);
  if (aliasIndex < 0) return args;
  if (args.includes(canonical)) {
    throw new NavopError("invalid_arguments", `use only one of ${alias} or ${canonical}`);
  }
  const next = [...args];
  next[aliasIndex] = canonical;
  return next;
}

function replaceWithContent(args: string[], index: number, count: number, content: string | Buffer): string[] {
  const next = [...args];
  next.splice(index, count, "--content-base64", Buffer.from(content).toString("base64"));
  return next;
}

async function rawArguments(args: string[]): Promise<Record<string, unknown>> {
  const options = simpleOptions(args);
  const sources = [options.has("arguments"), options.has("file"), options.has("stdin")].filter(Boolean).length;
  if (sources > 1) throw new NavopError("invalid_arguments", "use only one of --arguments, --file, or --stdin");
  let text = options.get("arguments") ?? "{}";
  if (options.has("file")) text = await readFile(options.get("file")!, "utf8");
  if (options.has("stdin")) text = await readStdin();
  try {
    const value = JSON.parse(text);
    if (!value || Array.isArray(value) || typeof value !== "object") throw new Error();
    return value;
  } catch { throw new NavopError("invalid_arguments", "tool arguments must be a JSON object"); }
}

function simpleOptions(args: string[]): Map<string, string> {
  const options = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index]!;
    if (!token.startsWith("--")) throw new NavopError("invalid_arguments", `unexpected argument: ${token}`);
    const name = token.slice(2);
    if (["force", "stdin"].includes(name)) options.set(name, "true");
    else options.set(name, requiredValue(args, ++index, token));
  }
  return options;
}

function requiredValue(args: string[], index: number, option: string): string {
  const value = args[index];
  if (!value || value.startsWith("--")) throw new NavopError("invalid_arguments", `${option} requires a value`);
  return value;
}

function positiveInteger(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new NavopError("invalid_arguments", `${option} must be a positive integer`);
  return parsed;
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let text = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { text += chunk; });
    process.stdin.on("end", () => resolve(text));
    process.stdin.on("error", reject);
  });
}

function toolMessage(result: any): string {
  return result?.structuredContent?.message ?? result?.content?.[0]?.text ?? "Navop tool call failed";
}
