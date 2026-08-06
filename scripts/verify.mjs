/**
 * End-to-end verification: build must run first (`npm run build`).
 *
 * 1. ACP: drive the bundled mock agent through the harness's ACP client.
 * 2. Marketplace: resolve plugins, providers, and bundled skills.
 * 3. MCP: connect an in-memory MCP client to the server and exercise tools + the ext-apps
 *    dashboard resource (ui:// with the text/html;profile=mcp-app MIME type).
 */

import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { spawnAgent, textBlock } from "@acp/acp-client";
import { MarketplaceRegistry } from "@acp/marketplace";
import { createServer, DASHBOARD_URI } from "@acp/mcp-server";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const check = (label, cond) => {
  assert.ok(cond, label);
  passed++;
  console.log(`  ✓ ${label}`);
};

async function verifyAcp() {
  console.log("\n[1/3] ACP harness ↔ mock agent");
  const agent = spawnAgent(
    { command: "node", args: [join(repoRoot, "packages/mock-agent/bin/acp-mock-agent.js")], env: { MOCK_AGENT_DELAY_MS: "0" } },
    { handlers: { onUpdate: () => {} }, stderr: null },
  );
  try {
    const init = await agent.client.initialize();
    check("initialize negotiates protocol v1", init.protocolVersion === 1);
    check("agent advertises info", init.agentInfo?.name === "acp-mock-agent");
    const session = await agent.client.newSession({ cwd: repoRoot, mcpServers: [] });
    check("session/new returns a sessionId", typeof session.sessionId === "string" && session.sessionId.length > 0);

    const res = await agent.client.prompt({ sessionId: session.sessionId, prompt: [textBlock("hello acp")] });
    check("session/prompt ends the turn", res.stopReason === "end_turn");
  } finally {
    agent.dispose();
  }
}

function verifyMarketplace() {
  console.log("\n[2/3] Marketplace registry");
  const registry = new MarketplaceRegistry({
    marketplaceDir: join(repoRoot, "marketplace"),
    claudeDir: join(repoRoot, ".claude"),
  });
  const plugins = registry.listPlugins();
  check("catalog has 4 plugins", plugins.length === 4);
  const providers = new Set(plugins.map((p) => p.provider));
  check("classifies claude/github/generic-agent", ["claude", "github", "generic-agent"].every((p) => providers.has(p)));
  const skills = registry.listSkills().map((s) => s.name).sort();
  check(
    "discovers the 3 curated skills",
    ["acp-session-runner", "marketplace-curator", "mcp-app-builder"].every((s) => skills.includes(s)),
  );
  const md = registry.listMarketplaces();
  check("lists known + suggested marketplaces", md.some((m) => m.kind === "known") && md.some((m) => m.kind === "suggested"));
  const one = registry.getSkill("mcp-app-builder");
  check("getSkill returns frontmatter + body", one?.data.name === "mcp-app-builder" && one.body.length > 0);
}

async function verifyMcp() {
  console.log("\n[3/3] MCP 2.0 server (in-memory client)");
  const { server } = createServer(repoRoot);
  const client = new Client({ name: "verify-client", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  try {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    for (const expected of [
      "acp_list_agents",
      "acp_run_prompt",
      "marketplace_list_plugins",
      "marketplace_search",
      "skills_list",
      "skills_get",
      "open_marketplace_dashboard",
    ]) {
      check(`tool registered: ${expected}`, names.includes(expected));
    }

    const dash = tools.find((t) => t.name === "open_marketplace_dashboard");
    const meta = dash?._meta ?? {};
    const linked = meta.ui?.resourceUri ?? meta["ui/resourceUri"];
    check("dashboard tool links ui:// resource via _meta", linked === DASHBOARD_URI);

    const { resources } = await client.listResources();
    const dashboard = resources.find((r) => r.uri === DASHBOARD_URI);
    check("dashboard resource is registered", Boolean(dashboard));
    check("dashboard MIME is text/html;profile=mcp-app", dashboard?.mimeType === "text/html;profile=mcp-app");

    const listPlugins = await client.callTool({ name: "marketplace_list_plugins", arguments: {} });
    check("marketplace_list_plugins returns 4 plugins", listPlugins.structuredContent?.count === 4);

    const read = await client.readResource({ uri: DASHBOARD_URI });
    const html = read.contents[0]?.text ?? "";
    check("dashboard HTML includes injected snapshot", html.includes("__ACP_SNAPSHOT__ ="));
    check("dashboard HTML is a full document", html.includes("<!doctype html>"));

    const run = await client.callTool({
      name: "acp_run_prompt",
      arguments: { agentId: "mock", prompt: "hi from mcp", cwd: repoRoot, timeoutMs: 15000 },
    });
    check("acp_run_prompt drives the mock agent", run.structuredContent?.stopReason === "end_turn");
    check("acp_run_prompt returns agent text", String(run.structuredContent?.text ?? "").includes("mock agent"));
  } finally {
    await client.close();
    await server.close();
  }
}

async function main() {
  await verifyAcp();
  verifyMarketplace();
  await verifyMcp();
  console.log(`\nAll ${passed} checks passed ✅`);
}

main().catch((err) => {
  console.error("\nVERIFICATION FAILED:", err);
  process.exit(1);
});
