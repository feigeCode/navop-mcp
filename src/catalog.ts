import { NavopError } from "./errors.js";

export interface DomainCommand {
  path: string[];
  tool: string;
  summary: string;
  fixedArguments?: Record<string, unknown>;
}

export const DOMAIN_COMMANDS: DomainCommand[] = [
  command("ssh exec", "ssh.exec", "Execute a command on an active SSH session"),
  command("ssh diagnostics", "ssh.session_diagnostics", "Inspect an active SSH session"),
  command("ssh command poll", "ssh.command.poll", "Poll a tracked SSH command"),
  command("ssh command output", "ssh.command.output", "Read tracked SSH command output"),
  command("ssh command cancel", "ssh.command.cancel", "Cancel a tracked SSH command"),
  command("terminal read", "terminal.read", "Read visible terminal output"),
  command("terminal exec", "terminal.exec", "Execute in a visible terminal"),
  command("terminal interrupt", "terminal.control", "Interrupt a visible terminal", { action: "interrupt" }),
  command("db schema", "db.schema", "Read database schema metadata"),
  command("db tables", "db.tables", "List database tables"),
  command("db describe", "db.describe_table", "Describe a database table"),
  command("db sample", "db.sample_rows", "Read sample rows"),
  command("db query", "db.query", "Run a read-only SQL query"),
  command("db exec", "db.exec", "Execute a write-capable SQL script"),
  command("redis connections", "redis.list_connections", "List active Redis connections"),
  command("redis command", "redis.command", "Execute a Redis command"),
  command("redis keys", "redis.keys", "List matching Redis keys"),
  command("redis get", "redis.get", "Read a Redis value"),
  command("redis set", "redis.set", "Write a Redis value"),
  command("mongo connections", "mongo.list_connections", "List active MongoDB connections"),
  command("mongo databases", "mongo.list_databases", "List MongoDB databases"),
  command("mongo collections", "mongo.list_collections", "List MongoDB collections"),
  command("mongo find", "mongo.find", "Find MongoDB documents"),
  command("mongo aggregate", "mongo.aggregate", "Aggregate MongoDB documents"),
  command("mongo count", "mongo.count", "Count MongoDB documents"),
  command("mongo indexes", "mongo.list_indexes", "List MongoDB indexes"),
  command("mongo index create", "mongo.create_index", "Create a MongoDB index"),
  command("mongo index drop", "mongo.drop_index", "Drop a MongoDB index"),
  command("mongo collection create", "mongo.create_collection", "Create a MongoDB collection"),
  command("mongo database drop", "mongo.drop_database", "Drop a MongoDB database"),
  command("mongo validation get", "mongo.get_validation", "Read MongoDB collection validation"),
  command("mongo validation set", "mongo.set_validation", "Set MongoDB collection validation"),
  command("mongo insert", "mongo.insert", "Insert a MongoDB document"),
  command("mongo replace", "mongo.replace", "Replace a MongoDB document"),
  command("mongo update", "mongo.update", "Update MongoDB document fields"),
  command("mongo delete", "mongo.delete", "Delete a MongoDB document"),
  command("mongo explain", "mongo.explain", "Explain a MongoDB find operation"),
  command("sftp list", "sftp.list", "List a remote directory"),
  command("sftp read", "sftp.read", "Read a remote file"),
  command("sftp write", "sftp.write", "Write a remote file"),
  command("sftp stat", "sftp.stat", "Inspect a remote path"),
  command("sftp upload", "sftp.upload", "Upload a local path"),
  command("sftp download", "sftp.download", "Download a remote path"),
  command("connections list", "connections.list", "List saved connections"),
  command("connections show", "connections.show", "Show a saved connection"),
  command("connections find", "connections.find", "Find saved connections"),
  command("connections kinds", "connections.list_kinds", "List connection kinds"),
  command("connections schema", "connections.get_schema", "Get a connection kind schema"),
  command("connections validate", "connections.validate", "Validate connection input"),
  command("connections save", "connections.save", "Create or update a connection"),
  command("connections delete", "connections.delete", "Delete a saved connection"),
  command("connections test", "connections.test", "Test a saved connection"),
  command("connections open", "connections.open_session", "Open a connection session"),
  command("connections sessions", "connections.list_sessions", "List active sessions"),
  command("workspace list", "workspaces.list", "List workspaces"),
  command("workspace show", "workspaces.show", "Show a workspace"),
  command("functions list", "internal_functions.list", "List Navop internal functions"),
  command("functions call", "internal_functions.call", "Call a Navop internal function"),
];

export function resolveDomainCommand(tokens: string[]): DomainCommand {
  const matches = DOMAIN_COMMANDS.filter((candidate) => prefixMatches(tokens, candidate.path));
  const exact = matches.find((candidate) => candidate.path.length === tokens.length);
  if (exact) return exact;
  throw new NavopError("invalid_arguments", `unknown command: navop ${tokens.join(" ")}`);
}

export function commandChildren(path: string[]): DomainCommand[] {
  return DOMAIN_COMMANDS.filter((candidate) => prefixMatches(path, candidate.path));
}

function command(path: string, tool: string, summary: string, fixedArguments?: Record<string, unknown>): DomainCommand {
  return { path: path.split(" "), tool, summary, ...(fixedArguments ? { fixedArguments } : {}) };
}

function prefixMatches(prefix: string[], value: string[]): boolean {
  return prefix.every((token, index) => value[index] === token);
}
