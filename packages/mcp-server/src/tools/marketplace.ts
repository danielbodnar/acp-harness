/** MCP tools that expose the multi-provider plugin marketplace. */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { ResolvedPlugin } from "@acp/marketplace";

import type { ServerContext } from "../context.js";
import { jsonResult } from "./helpers.js";

function summarize(p: ResolvedPlugin) {
  return {
    name: p.name,
    provider: p.provider,
    description: p.description,
    version: p.version,
    category: p.category,
    keywords: p.keywords,
    skills: p.skills.map((s) => s.name),
    agent: p.agent ? [p.agent.command, ...(p.agent.args ?? [])].join(" ") : undefined,
    localPath: p.localPath,
  };
}

export function registerMarketplaceTools(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "marketplace_list_plugins",
    {
      title: "List marketplace plugins",
      description:
        "List every plugin in the marketplace catalog with its provider classification " +
        "(claude / github / generic-agent) and bundled skills.",
    },
    async () => {
      const plugins = ctx.registry.listPlugins().map(summarize);
      return jsonResult({ catalog: ctx.registry.catalogFile, count: plugins.length, plugins });
    },
  );

  server.registerTool(
    "marketplace_search",
    {
      title: "Search marketplace plugins",
      description: "Case-insensitive keyword search over plugin names, descriptions, and keywords.",
      inputSchema: { query: z.string().describe("Search term.") },
    },
    async ({ query }) => {
      const matches = ctx.registry.search(query).map(summarize);
      return jsonResult({ query, count: matches.length, matches });
    },
  );

  server.registerTool(
    "marketplace_plugin_info",
    {
      title: "Inspect a marketplace plugin",
      description: "Return full details for a single plugin, including provider, source, and skills.",
      inputSchema: { name: z.string().describe("Plugin name.") },
    },
    async ({ name }) => {
      const plugin = ctx.registry.getPlugin(name);
      if (!plugin) {
        return jsonResult(
          { error: `Unknown plugin: ${name}`, available: ctx.registry.listPlugins().map((p) => p.name) },
          { isError: true },
        );
      }
      return jsonResult({
        ...summarize(plugin),
        source: plugin.source,
        skills: plugin.skills,
      });
    },
  );

  server.registerTool(
    "marketplace_list_marketplaces",
    {
      title: "List known and suggested marketplaces",
      description:
        "Enumerate known extra marketplaces (from .claude/settings.json) and suggested marketplaces " +
        "to add, each flagged with its kind.",
    },
    async () => {
      const marketplaces = ctx.registry.listMarketplaces();
      return jsonResult({ count: marketplaces.length, marketplaces });
    },
  );

  server.registerTool(
    "marketplace_install_plan",
    {
      title: "Plan a plugin install",
      description:
        "Return the exact Claude Code commands to add this marketplace and install a plugin. " +
        "This is a dry-run planner; it does not modify any Claude Code configuration.",
      inputSchema: { name: z.string().describe("Plugin name to install.") },
    },
    async ({ name }) => {
      const plugin = ctx.registry.getPlugin(name);
      if (!plugin) {
        return jsonResult({ error: `Unknown plugin: ${name}` }, { isError: true });
      }
      const marketplaceName = ctx.registry.loadCatalog().name;
      return jsonResult({
        plugin: plugin.name,
        provider: plugin.provider,
        steps: [
          `/plugin marketplace add ${ctx.paths.marketplaceDir}`,
          `/plugin install ${plugin.name}@${marketplaceName}`,
        ],
        note: "Dry-run only. Run these inside Claude Code to install.",
      });
    },
  );
}
