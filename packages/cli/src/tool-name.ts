/**
 * 工具名的两套写法。
 *
 * Navop 宿主内部用点号分层命名工具（`sftp.upload`、`ssh.command.poll`），但
 * `tools/list` 上暴露的是函数调用安全的名字（`.` → `_`）：Grok 等 OpenAI 兼容
 * 客户端只接受 `[A-Za-z0-9_-]`，带点的名字会在注册阶段被整批丢弃
 * （navop issue #194）。净化规则来自 `crates/agent_runtime/src/tools/spec.rs`
 * 的 `sanitize_tool_name`，这里必须逐字复刻，否则便利命令又会找不到工具。
 */
export function clientToolName(name: string): string {
  let out = "";
  let lastWasUnderscore = false;
  for (const ch of name) {
    const valid =
      (ch >= "a" && ch <= "z")
      || (ch >= "A" && ch <= "Z")
      || (ch >= "0" && ch <= "9")
      || ch === "_"
      || ch === "-";
    const next = valid ? ch : "_";
    if (next === "_" && lastWasUnderscore) continue;
    lastWasUnderscore = next === "_";
    out += next;
  }
  const trimmed = out.replace(/^_+|_+$/g, "");
  const normalized = trimmed === "" ? "tool" : trimmed;
  return /^[A-Za-z_]/.test(normalized) ? normalized : `tool_${normalized}`;
}

/**
 * 在 `tools/list` 的结果里找请求的工具，同时接受内部 id 与净化后的线上名。
 *
 * 先把请求名折成线上名，也把宿主返回的名字折一遍，因此新旧两端任意组合都能
 * 对上：新宿主只报 `sftp_upload`、旧宿主只报 `sftp.upload`、调用方传哪一种都可以。
 * 返回的是宿主实际公布的名字——调用时必须用它，否则冲突重名（`_2`）会打偏。
 */
export function resolveAdvertisedToolName(tools: unknown[], requested: string): string | undefined {
  const names = tools
    .map((tool) => (tool && typeof (tool as { name?: unknown }).name === "string" ? String((tool as { name: string }).name) : undefined))
    .filter((name): name is string => name !== undefined);
  if (names.includes(requested)) return requested;
  const wanted = clientToolName(requested);
  return names.find((name) => name === wanted) ?? names.find((name) => clientToolName(name) === wanted);
}

/**
 * 工具所属的宿主 Tool Exposure 分组 id，用于「工具不可用」时的定位提示。
 *
 * 名字可能是点号内部 id，也可能是净化后的线上名，所以先抹平分隔符再按分组
 * 前缀匹配（`internal_functions` 这类自带下划线的分组必须先于单词前缀判断）。
 */
export function toolGroupId(name: string): string {
  const flat = name.replaceAll(".", "_");
  for (const [prefix, group] of TOOL_GROUP_PREFIXES) {
    if (flat === prefix || flat.startsWith(`${prefix}_`)) return group;
  }
  return name.split(/[._]/, 1)[0] ?? name;
}

const TOOL_GROUP_PREFIXES: Array<[prefix: string, group: string]> = [
  ["internal_functions", "internal_functions"],
  ["terminal", "terminal_exec"],
  ["mongodb", "mongodb"],
  ["mongo", "mongodb"],
  ["connections", "connections"],
  ["workspaces", "workspaces"],
  ["navop", "navop"],
  ["ssh", "ssh"],
  ["db", "database"],
  ["redis", "redis"],
  ["sftp", "sftp"],
];
