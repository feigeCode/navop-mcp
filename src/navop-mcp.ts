#!/usr/bin/env node
import { runBridge } from "./bridge.js";
import { readDiscovery, resolveDiscoveryPath } from "./discovery.js";
import { exitCode, NavopError } from "./errors.js";

async function main(argv: string[]): Promise<void> {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write("Usage: navop-mcp [--discovery <path>]\n");
    return;
  }
  if (argv.includes("--version") || argv.includes("-V")) {
    process.stdout.write("0.1.0\n");
    return;
  }
  let discovery: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== "--discovery") throw new NavopError("invalid_arguments", "Usage: navop-mcp [--discovery <path>]");
    discovery = argv[++index];
    if (!discovery) throw new NavopError("invalid_arguments", "--discovery requires a path");
  }
  await runBridge(await readDiscovery(await resolveDiscoveryPath(discovery)));
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = exitCode(error);
});
