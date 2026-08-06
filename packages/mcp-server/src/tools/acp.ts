/** MCP tools that expose the ACP harness: list agents and run a prompt against one. */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { runAcpPrompt } from "../acp-runner.js";
import type { ServerContext } from "../context.js";
import { jsonResult } from "./helpers.js";

export function registerAcpTools(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "acp_list_agents",
    {
      title: "List ACP agents",
      description:
        "List the ACP-compliant coding agents configured in this harness (config/agents.json). " +
        "Returns each agent's id, name, description, and launch command.",
    },
    async () => {
      const agents = ctx.agents().map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description ?? "",
        command: [a.command, ...(a.args ?? [])].join(" "),
        auth: a.auth,
      }));
      return jsonResult({ count: agents.length, agents });
    },
  );

  server.registerTool(
    "acp_run_prompt",
    {
      title: "Run an ACP prompt",
      description:
        "Spawn a configured ACP agent, open a session, send a single prompt, and return the " +
        "agent's aggregated text output, any tool calls it made, and the final stop reason.",
      inputSchema: {
        agentId: z.string().describe("The agent id from acp_list_agents (e.g. 'mock')."),
        prompt: z.string().describe("The user prompt to send."),
        cwd: z.string().optional().describe("Working directory for the session (absolute path)."),
        timeoutMs: z.number().int().positive().optional().describe("Turn timeout in ms (default 60000)."),
      },
    },
    async ({ agentId, prompt, cwd, timeoutMs }) => {
      const agent = ctx.agents().find((a) => a.id === agentId);
      if (!agent) {
        return jsonResult(
          { error: `Unknown agent: ${agentId}`, available: ctx.agents().map((a) => a.id) },
          { isError: true },
        );
      }
      try {
        const result = await runAcpPrompt(agent, {
          prompt,
          cwd: cwd ?? ctx.paths.repoRoot,
          timeoutMs,
        });
        return jsonResult(result);
      } catch (err) {
        return jsonResult({ error: (err as Error).message, agentId }, { isError: true });
      }
    },
  );
}
