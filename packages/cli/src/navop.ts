#!/usr/bin/env node
import { exitCode } from "@navop/client";
import { failure, success } from "./output.js";
import { runCli } from "./runner.js";
import { PACKAGE_VERSION } from "./version.js";

async function main(argv: string[]): Promise<void> {
  if (argv.includes("--version") || argv.includes("-V")) {
    process.stdout.write(`${PACKAGE_VERSION}\n`);
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

function formatHuman(value: unknown): string {
  if (value && typeof value === "object" && "content" in value) return String((value as { content: unknown }).content);
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = exitCode(error);
});
