/**
 * Entry point for the mock ACP agent. Wires the process's stdio to a JSON-RPC peer using
 * ndjson framing and registers the agent-side methods.
 */

import { createLineSplitter, JsonRpcPeer } from "@acp/acp-client";

import { registerMockAgent } from "./agent.js";

export { registerMockAgent } from "./agent.js";
export type { MockAgentOptions } from "./agent.js";

export function main(): void {
  const peer = new JsonRpcPeer(
    (line) => process.stdout.write(line),
    // Protocol diagnostics must go to stderr so they never corrupt the stdout message stream.
    { onError: (message, detail) => process.stderr.write(`[mock-agent] ${message} ${detail ?? ""}\n`) },
  );

  registerMockAgent(peer, { streamDelayMs: Number(process.env.MOCK_AGENT_DELAY_MS ?? 40) });

  process.stdin.setEncoding("utf8");
  const feed = createLineSplitter((line) => peer.handleLine(line));
  process.stdin.on("data", (chunk: string) => feed(chunk));
  process.stdin.on("end", () => process.exit(0));

  process.stderr.write("[mock-agent] ready (ACP over ndjson stdio)\n");
}
