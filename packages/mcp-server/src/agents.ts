/** Minimal agent-registry loader for the MCP server (reads `config/agents.json`). */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { RepoPaths } from "@acp/marketplace";

export interface AgentConfig {
  id: string;
  name: string;
  description?: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  auth?: string;
}

function substitute(value: string, vars: Record<string, string>): string {
  return value.replace(/\$\{(\w+)\}/g, (m, key: string) => vars[key] ?? m);
}

export function loadAgents(paths: RepoPaths): AgentConfig[] {
  const file = join(paths.configDir, "agents.json");
  if (!existsSync(file)) return [];
  const parsed = JSON.parse(readFileSync(file, "utf8")) as { agents?: AgentConfig[] };
  const vars = { repoRoot: paths.repoRoot, cwd: process.cwd() };
  return (parsed.agents ?? []).map((a) => ({
    ...a,
    command: substitute(a.command, vars),
    args: a.args?.map((arg) => substitute(arg, vars)),
    cwd: a.cwd ? substitute(a.cwd, vars) : undefined,
    env: a.env ? Object.fromEntries(Object.entries(a.env).map(([k, v]) => [k, substitute(v, vars)])) : undefined,
  }));
}
