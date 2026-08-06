/** `acp-harness agents` — list the configured ACP agents. */

import { loadAgents } from "../config.js";

export function runAgents(opts: { configFile?: string }): number {
  const { agents, configFile } = loadAgents({ configFile: opts.configFile });
  if (agents.length === 0) {
    console.log(`No agents configured in ${configFile}`);
    return 0;
  }
  console.log(`Configured ACP agents (${configFile}):\n`);
  for (const agent of agents) {
    const cmd = [agent.command, ...(agent.args ?? [])].join(" ");
    console.log(`  ${agent.id}`);
    console.log(`    name: ${agent.name}`);
    if (agent.description) console.log(`    desc: ${agent.description}`);
    console.log(`    cmd:  ${cmd}`);
    if (agent.auth) console.log(`    auth: ${agent.auth}`);
    console.log("");
  }
  return 0;
}
