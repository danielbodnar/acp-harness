/** Assemble the MCP server: create it, wire the shared context, and register everything. */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerDashboardApp } from "./apps/dashboard.js";
import { createContext, type ServerContext } from "./context.js";
import { registerAcpTools } from "./tools/acp.js";
import { registerMarketplaceTools } from "./tools/marketplace.js";
import { registerSkillsTools } from "./tools/skills.js";

export const SERVER_INFO = { name: "acp-harness-mcp", version: "0.1.0" } as const;

export function createServer(fromDir?: string): { server: McpServer; ctx: ServerContext } {
  const ctx = createContext(fromDir);

  const server = new McpServer(SERVER_INFO, {
    instructions:
      "ACP Harness MCP server. Use acp_* tools to list and drive ACP coding agents, " +
      "marketplace_* tools to browse the multi-provider plugin marketplace, skills_* tools to " +
      "read bundled Agent Skills, and open_marketplace_dashboard to render the ext-apps UI.",
    capabilities: {
      tools: {},
      resources: {},
    },
  });

  registerAcpTools(server, ctx);
  registerMarketplaceTools(server, ctx);
  registerSkillsTools(server, ctx);
  registerDashboardApp(server, ctx);

  return { server, ctx };
}
