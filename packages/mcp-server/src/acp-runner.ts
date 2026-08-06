/**
 * Drive an ACP agent through a single prompt turn and collect its output. Used by the
 * `acp_run_prompt` MCP tool so any MCP host can run any ACP agent through the harness.
 */

import { spawnAgent, textBlock, type SessionNotification } from "@acp/acp-client";

import type { AgentConfig } from "./agents.js";

export interface AcpRunResult {
  agentId: string;
  sessionId: string;
  protocolVersion: number | null;
  stopReason: string;
  text: string;
  toolCalls: Array<{ toolCallId: string; title?: string; status?: string }>;
}

export interface AcpRunOptions {
  prompt: string;
  cwd: string;
  timeoutMs?: number;
}

export async function runAcpPrompt(agent: AgentConfig, options: AcpRunOptions): Promise<AcpRunResult> {
  const timeoutMs = options.timeoutMs ?? 60_000;
  let text = "";
  const toolCalls: AcpRunResult["toolCalls"] = [];

  const onUpdate = (n: SessionNotification) => {
    const u = n.update;
    if (u.sessionUpdate === "agent_message_chunk") {
      const content = (u as { content?: { text?: string } }).content;
      if (content?.text) text += content.text;
    } else if (u.sessionUpdate === "tool_call") {
      const tc = u as { toolCallId: string; title?: string; status?: string };
      toolCalls.push({ toolCallId: tc.toolCallId, title: tc.title, status: tc.status });
    } else if (u.sessionUpdate === "tool_call_update") {
      const tc = u as { toolCallId: string; status?: string };
      const existing = toolCalls.find((t) => t.toolCallId === tc.toolCallId);
      if (existing) existing.status = tc.status ?? existing.status;
    }
  };

  const spawned = spawnAgent(
    { command: agent.command, args: agent.args, env: agent.env, cwd: agent.cwd ?? options.cwd },
    {
      clientInfo: { name: "acp-harness-mcp", version: "0.1.0" },
      // Non-interactive: auto-allow permissions and back fs with the local disk is out of
      // scope here (agents that need fs will get method-not-found, which they must tolerate).
      handlers: { onUpdate },
      // Keep the agent's stderr out of our stdout MCP stream.
      stderr: null,
    },
  );

  const timeout = new Promise<never>((_, reject) => {
    const t = setTimeout(() => {
      spawned.dispose();
      reject(new Error(`ACP agent timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    // Do not keep the event loop alive solely for the timeout.
    if (typeof t.unref === "function") t.unref();
  });

  try {
    await Promise.race([spawned.client.initialize(), timeout]);
    const session = await Promise.race([
      spawned.client.newSession({ cwd: options.cwd, mcpServers: [] }),
      timeout,
    ]);
    const result = await Promise.race([
      spawned.client.prompt({ sessionId: session.sessionId, prompt: [textBlock(options.prompt)] }),
      timeout,
    ]);

    return {
      agentId: agent.id,
      sessionId: session.sessionId,
      protocolVersion: spawned.client.protocolVersion,
      stopReason: result.stopReason,
      text,
      toolCalls,
    };
  } finally {
    spawned.dispose();
  }
}
