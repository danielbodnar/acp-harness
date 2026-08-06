/** `acp-harness plugins [list|skills|marketplaces|search <term>]` — browse the marketplace. */

import { MarketplaceRegistry } from "@acp/marketplace";

export function runPlugins(sub: string[], _opts: Record<string, unknown>): number {
  const registry = new MarketplaceRegistry();
  const action = sub[0] ?? "list";

  switch (action) {
    case "list": {
      const plugins = registry.listPlugins();
      console.log(`Plugins in ${registry.catalogFile}:\n`);
      for (const p of plugins) {
        console.log(`  ${p.name}  [${p.provider}]${p.version ? ` v${p.version}` : ""}`);
        if (p.description) console.log(`    ${p.description}`);
        if (p.skills.length) console.log(`    skills: ${p.skills.map((s) => s.name).join(", ")}`);
        if (p.agent) console.log(`    agent:  ${[p.agent.command, ...(p.agent.args ?? [])].join(" ")}`);
        console.log("");
      }
      return 0;
    }
    case "skills": {
      const skills = registry.listSkills();
      console.log(`Bundled skills (${skills.length}):\n`);
      for (const s of skills) {
        console.log(`  ${s.name}  (from ${s.plugin})`);
        if (s.description) console.log(`    ${s.description}`);
      }
      return 0;
    }
    case "marketplaces": {
      const markets = registry.listMarketplaces();
      console.log("Known and suggested marketplaces:\n");
      for (const m of markets) {
        console.log(`  ${m.name}  [${m.kind}]  ${m.source}`);
        if (m.description) console.log(`    ${m.description}`);
      }
      return 0;
    }
    case "search": {
      const term = sub.slice(1).join(" ");
      const matches = registry.search(term);
      console.log(`Search "${term}" → ${matches.length} match(es):\n`);
      for (const p of matches) console.log(`  ${p.name}  [${p.provider}] — ${p.description}`);
      return 0;
    }
    default:
      console.error(`Unknown plugins subcommand: ${action}`);
      return 1;
  }
}
