#!/usr/bin/env node
import { runBridge } from "./bridge.js";
import { readDiscovery, resolveDiscoveryPath } from "./discovery.js";
import { exitCode } from "./errors.js";
import { commandHelp, rootHelp } from "./help.js";
import { failure, success } from "./output.js";
import { runCli } from "./runner.js";

async function main(argv: string[]): Promise<void> {
  if (argv.includes("--version") || argv.includes("-V")) {
    process.stdout.write("0.1.0\n");
    return;
  }
  if (argv[0] === "mcp") {
    if (argv.includes("--help") || argv.includes("-h")) {
      process.stdout.write(commandHelp(["mcp"]));
      return;
    }
    const discovery = bridgeDiscoveryOption(argv.slice(1));
    await runBridge(await readDiscovery(await resolveDiscoveryPath(discovery)));
    return;
  }
  try {
    const output = await runCli(argv);
    if (output.text !== undefined) process.stdout.write(output.text);
    else process.stdout.write(`${output.json ? success(output.result) : formatHuman(output.result)}\n`);
  } catch (error) {
    const json = argv.includes("--json");
    (json ? process.stdout : process.stderr).write(`${json ? failure(error) : error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = exitCode(error);
  }
}

function bridgeDiscoveryOption(args: string[]): string | undefined {
  if (args.length === 0) return undefined;
  if (args.length === 2 && args[0] === "--discovery" && args[1]) return args[1];
  throw new Error("Usage: navop mcp [--discovery <path>]");
}

function formatHuman(value: unknown): string {
  if (value && typeof value === "object" && "content" in value) return String((value as { content: unknown }).content);
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = exitCode(error);
});
