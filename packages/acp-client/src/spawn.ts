/**
 * Spawn an ACP agent subprocess and wire it to an {@link AcpClient} over ndjson stdio.
 *
 * The agent's stdout carries JSON-RPC messages (one per line); its stdin receives ours.
 * The agent's stderr is forwarded for diagnostics and never parsed as protocol.
 */

import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";

import { AcpClient, type AcpClientOptions } from "./client.js";
import { createLineSplitter, JsonRpcPeer, type JsonRpcPeerOptions } from "./jsonrpc.js";

export interface AgentLaunchSpec {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface SpawnedAgent {
  client: AcpClient;
  child: ChildProcessWithoutNullStreams;
  /** Resolves when the child process exits. */
  exited: Promise<number | null>;
  /** Terminate the agent and reject any in-flight requests. */
  dispose: () => void;
}

export interface SpawnAgentOptions extends AcpClientOptions {
  peerOptions?: JsonRpcPeerOptions;
  /** Where to forward the agent's stderr. Defaults to `process.stderr`. Pass `null` to drop it. */
  stderr?: NodeJS.WritableStream | null;
}

export function spawnAgent(spec: AgentLaunchSpec, options: SpawnAgentOptions = {}): SpawnedAgent {
  const child = spawn(spec.command, spec.args ?? [], {
    cwd: spec.cwd,
    env: { ...process.env, ...spec.env },
    stdio: ["pipe", "pipe", "pipe"],
  }) as ChildProcessWithoutNullStreams;

  const peer = new JsonRpcPeer((line) => {
    if (child.stdin.writable) child.stdin.write(line);
  }, options.peerOptions);

  const client = new AcpClient(peer, options);

  child.stdout.setEncoding("utf8");
  const feed = createLineSplitter((line) => peer.handleLine(line));
  child.stdout.on("data", (chunk: string) => feed(chunk));

  const stderr = options.stderr === undefined ? process.stderr : options.stderr;
  if (stderr) {
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => stderr.write(chunk));
  }

  const exited = new Promise<number | null>((resolve) => {
    child.on("close", (code) => {
      peer.rejectAllPending(new Error(`agent process exited (code ${code ?? "null"})`));
      resolve(code);
    });
  });

  const dispose = () => {
    if (!child.killed) child.kill();
  };

  return { client, child, exited, dispose };
}
