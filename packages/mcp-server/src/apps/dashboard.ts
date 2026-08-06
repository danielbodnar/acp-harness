/**
 * Register the ext-apps (MCP Apps) dashboard: a `ui://` HTML resource plus a tool linked to
 * it via `_meta.ui.resourceUri`. Capable hosts render the View in a sandboxed iframe; other
 * hosts still receive the tool's structured JSON.
 */

import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ServerContext } from "../context.js";
import { DASHBOARD_HTML_TEMPLATE, SNAPSHOT_MARKER } from "./dashboard-html.js";

export const DASHBOARD_URI = "ui://acp-harness/dashboard.html";

/** Build the catalog snapshot consumed by both the tool output and the injected View. */
export function buildCatalogSnapshot(ctx: ServerContext) {
  const plugins = ctx.registry.listPlugins().map((p) => ({
    name: p.name,
    provider: p.provider,
    description: p.description,
    version: p.version,
    skills: p.skills.map((s) => s.name),
    agent: p.agent ? [p.agent.command, ...(p.agent.args ?? [])].join(" ") : undefined,
  }));
  const skills = ctx.registry.listSkills().map((s) => ({
    name: s.name,
    description: s.description,
    plugin: s.plugin,
  }));
  const marketplaces = ctx.registry.listMarketplaces();
  return { plugins, skills, marketplaces };
}

function renderHtml(ctx: ServerContext): string {
  const snapshot = buildCatalogSnapshot(ctx);
  const injection = `window.__ACP_SNAPSHOT__ = ${JSON.stringify(snapshot)};`;
  return DASHBOARD_HTML_TEMPLATE.replace(SNAPSHOT_MARKER, injection);
}

export function registerDashboardApp(server: McpServer, ctx: ServerContext): void {
  // The UI resource (ui:// scheme, text/html;profile=mcp-app MIME type).
  registerAppResource(
    server,
    "ACP Harness Dashboard",
    DASHBOARD_URI,
    {
      description: "Interactive marketplace dashboard: plugins by provider, bundled skills, and marketplaces.",
    },
    async () => ({
      contents: [
        {
          uri: DASHBOARD_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: renderHtml(ctx),
        },
      ],
    }),
  );

  // The tool linked to the resource. Calling it returns the catalog data the View renders.
  registerAppTool(
    server,
    "open_marketplace_dashboard",
    {
      title: "Open marketplace dashboard",
      description:
        "Open the interactive ACP Harness marketplace dashboard (an ext-apps / MCP Apps View). " +
        "Returns the plugin catalog, bundled skills, and known/suggested marketplaces.",
      _meta: { ui: { resourceUri: DASHBOARD_URI } },
    },
    async () => {
      const snapshot = buildCatalogSnapshot(ctx);
      return {
        content: [
          {
            type: "text",
            text:
              `Marketplace: ${snapshot.plugins.length} plugins, ` +
              `${snapshot.skills.length} skills, ${snapshot.marketplaces.length} marketplaces. ` +
              `Open the dashboard View to explore them.`,
          },
        ],
        structuredContent: snapshot,
      };
    },
  );
}
