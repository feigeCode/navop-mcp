import { NavopError } from "./errors.js";

interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
}

export function buildToolArguments(
  argv: string[],
  schema: JsonSchema,
  fixed: Record<string, unknown> = {},
): Record<string, unknown> {
  const properties = schema.properties ?? {};
  const collected = collectFlags(argv, properties);
  const result: Record<string, unknown> = { ...fixed };
  for (const [flag, values] of collected) {
    const name = flag.replaceAll("-", "_");
    if (fixed[name] !== undefined) {
      throw new NavopError("invalid_arguments", `option --${flag} is fixed by this command`);
    }
    const property = properties[name];
    if (!property) throw new NavopError("invalid_arguments", `unknown option --${flag}`);
    result[name] = convertValues(flag, values, property);
  }
  for (const required of schema.required ?? []) {
    if (result[required] === undefined) {
      throw new NavopError("invalid_arguments", `missing required option --${required.replaceAll("_", "-")}`);
    }
  }
  return result;
}

function collectFlags(argv: string[], properties: Record<string, JsonSchema>): Map<string, string[]> {
  const flags = new Map<string, string[]>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;
    if (!token.startsWith("--")) throw new NavopError("invalid_arguments", `unexpected argument: ${token}`);
    const negative = token.startsWith("--no-");
    const name = token.slice(negative ? 5 : 2);
    const inline = name.split("=", 2);
    const key = inline[0]!;
    const property = properties[key.replaceAll("-", "_")];
    if (!property) throw new NavopError("invalid_arguments", `unknown option --${key}`);
    if (negative && primaryType(property.type) !== "boolean") {
      throw new NavopError("invalid_arguments", `option --no-${key} is only valid for booleans`);
    }
    let value = negative ? "false" : inline[1];
    if (value === undefined && argv[index + 1]?.startsWith("--") !== false) {
      if (primaryType(property.type) !== "boolean") {
        throw new NavopError("invalid_arguments", `--${key} requires a value`);
      }
      value = "true";
    }
    else if (value === undefined) value = argv[++index];
    const existing = flags.get(key) ?? [];
    existing.push(value!);
    flags.set(key, existing);
  }
  return flags;
}

function convertValues(flag: string, values: string[], schema: JsonSchema): unknown {
  const type = primaryType(schema.type);
  if (type === "array") return values.map((value) => convertScalar(flag, value, schema.items ?? {}));
  if (values.length > 1) throw new NavopError("invalid_arguments", `option --${flag} was provided more than once`);
  const converted = convertScalar(flag, values[0]!, schema);
  if (schema.enum && !schema.enum.includes(converted)) {
    throw new NavopError("invalid_arguments", `option --${flag} must be one of: ${schema.enum.join(", ")}`);
  }
  return converted;
}

function convertScalar(flag: string, value: string, schema: JsonSchema): unknown {
  const type = primaryType(schema.type);
  if (type === "boolean") {
    if (value === "true") return true;
    if (value === "false") return false;
    throw invalidType(flag, "boolean");
  }
  if (type === "integer") {
    const number = Number(value);
    if (Number.isSafeInteger(number)) return number;
    throw invalidType(flag, "integer");
  }
  if (type === "number") {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
    throw invalidType(flag, "number");
  }
  if (type === "object") {
    try { return JSON.parse(value); } catch { throw invalidType(flag, "JSON object"); }
  }
  return value;
}

function primaryType(type: JsonSchema["type"]): string {
  if (Array.isArray(type)) return type.find((value) => value !== "null") ?? "string";
  return type ?? "string";
}

function invalidType(flag: string, expected: string): NavopError {
  return new NavopError("invalid_arguments", `option --${flag} must be a ${expected}`);
}
