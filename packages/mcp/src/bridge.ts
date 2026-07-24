import type { Readable, Writable } from "node:stream";

import {
  connectRuntimeSocket,
  NavopError,
  readDiscovery,
  type DiscoveryDocument,
} from "@navop/client";

const CONNECTION_ATTEMPTS = 5;
const CONNECTION_RETRY_DELAY_MS = 75;

export async function runBridge(
  discovery: DiscoveryDocument,
  input: Readable = process.stdin,
  output: Writable = process.stdout,
): Promise<void> {
  const socket = await connectRuntimeSocket(discovery);
  await pipeBridge(socket, input, output);
}

export async function runBridgeFromDiscovery(
  discoveryPath: string,
  input: Readable = process.stdin,
  output: Writable = process.stdout,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < CONNECTION_ATTEMPTS; attempt += 1) {
    try {
      const socket = await connectRuntimeSocket(await readDiscovery(discoveryPath));
      await pipeBridge(socket, input, output);
      return;
    } catch (error) {
      lastError = error;
      if (attempt + 1 >= CONNECTION_ATTEMPTS || !isRetryableStartupError(error)) throw error;
      await delay(CONNECTION_RETRY_DELAY_MS * 2 ** attempt);
    }
  }
  throw lastError;
}

async function pipeBridge(
  socket: import("node:net").Socket,
  input: Readable,
  output: Writable,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    input.pipe(socket);
    socket.pipe(output);
    socket.once("end", resolve);
    socket.once("error", reject);
    input.once("error", reject);
    output.once("error", reject);
  });
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
