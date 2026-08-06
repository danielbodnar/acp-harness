/** Load the ACP agent registry (`config/agents.json`) used by the harness. */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { findRepoRoot, resolveRepoPaths } from "@acp/marketplace";

export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  /** Optional documentation of how the agent authenticates. */
  auth?: string;
}

export interface AgentsFile {
  agents: AgentConfig[];
}

/** Substitute `${repoRoot}` (and `${cwd}`) tokens in a string. */
function substitute(value: string, vars: Record<string, string>): string {
  return value.replace(/\$\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}

function expandAgent(agent: AgentConfig, vars: Record<string, string>): AgentConfig {
  return {
    ...agent,
    command: substitute(agent.command, vars),
    args: agent.args?.map((a) => substitute(a, vars)),
    cwd: agent.cwd ? substitute(agent.cwd, vars) : undefined,
    env: agent.env
      ? Object.fromEntries(Object.entries(agent.env).map(([k, v]) => [k, substitute(v, vars)]))
      : undefined,
  };
}

export interface LoadAgentsOptions {
  /** Explicit path to an agents.json file. */
  configFile?: string;
  /** Directory to begin repo-root detection from. */
  fromDir?: string;
}

export function loadAgents(options: LoadAgentsOptions = {}): {
  agents: AgentConfig[];
  repoRoot: string;
  configFile: string;
} {
  const repoRoot = findRepoRoot(options.fromDir) ?? process.cwd();
  const configFile =
    options.configFile ??
    (() => {
      try {
        return join(resolveRepoPaths(options.fromDir).configDir, "agents.json");
      } catch {
        return join(repoRoot, "config", "agents.json");
      }
    })();

  if (!existsSync(configFile)) {
    throw new Error(`Agents config not found: ${configFile}`);
  }
  const parsed = JSON.parse(readFileSync(configFile, "utf8")) as AgentsFile;
  const vars = { repoRoot, cwd: process.cwd() };
  const agents = (parsed.agents ?? []).map((a) => expandAgent(a, vars));
  return { agents, repoRoot, configFile };
}

export function findAgent(agents: AgentConfig[], id: string): AgentConfig | undefined {
  return agents.find((a) => a.id === id);
}
