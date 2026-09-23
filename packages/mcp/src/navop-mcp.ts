#!/usr/bin/env node
import { runBridgeFromDiscovery } from "./bridge.js";
import { exitCode, NavopError, resolveDiscoveryPath } from "@navop/client";
import { PACKAGE_VERSION } from "./version.js";

async function main(argv: string[]): Promise<void> {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write("Usage: navop-mcp [--discovery <path>]\n");
    return;
  }
  if (argv.includes("--version") || argv.includes("-V")) {
    process.stdout.write(`${PACKAGE_VERSION}\n`);
    return;
  }
  let discovery: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    // The 0.1.x launcher was `navop mcp --discovery <path>`; Navop builds released
    // before the arg removal still generate that positional, so accept and ignore it.
    if (index === 0 && argv[index] === "mcp") continue;
    if (argv[index] !== "--discovery") throw new NavopError("invalid_arguments", "Usage: navop-mcp [--discovery <path>]");
    discovery = argv[++index];
    if (!discovery) throw new NavopError("invalid_arguments", "--discovery requires a path");
  }
  await runBridgeFromDiscovery(await resolveDiscoveryPath(discovery));
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = exitCode(error);
});
