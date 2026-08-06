/** `acp-harness run <agentId> <prompt...>` — one-shot, non-interactive prompt turn. */

import { textBlock } from "@acp/acp-client";

import { findAgent, loadAgents } from "../config.js";
import { UpdateRenderer } from "../render.js";
import { connect } from "../session.js";

export interface RunOptions {
  agentId: string;
  prompt: string;
  cwd: string;
  configFile?: string;
  autoAllow?: boolean;
}

export async function runOnce(opts: RunOptions): Promise<number> {
  const { agents } = loadAgents({ configFile: opts.configFile });
  const agent = findAgent(agents, opts.agentId);
  if (!agent) {
    console.error(`Unknown agent: ${opts.agentId}. Run \`acp-harness agents\` to see options.`);
    return 1;
  }

  const renderer = new UpdateRenderer();
  const connection = await connect(agent, { cwd: opts.cwd, renderer, autoAllow: opts.autoAllow ?? true });

  try {
    const info = connection.agent.client.agentInfo;
    console.error(
      `↔ connected to ${info?.agentInfo?.name ?? agent.id} ` +
        `(ACP v${connection.agent.client.protocolVersion}) · session ${connection.session.sessionId}\n`,
    );

    const result = await connection.agent.client.prompt({
      sessionId: connection.session.sessionId,
      prompt: [textBlock(opts.prompt)],
    });
    renderer.finishStream();
    console.error(`\n■ stop reason: ${result.stopReason}`);
    return 0;
  } finally {
    connection.dispose();
  }
}
