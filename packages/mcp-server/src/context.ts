/** Shared server context: repo paths, the marketplace registry, and the agent registry. */

import { MarketplaceRegistry, resolveRepoPaths, type RepoPaths } from "@acp/marketplace";

import { loadAgents, type AgentConfig } from "./agents.js";

export interface ServerContext {
  paths: RepoPaths;
  registry: MarketplaceRegistry;
  agents: () => AgentConfig[];
}

export function createContext(fromDir?: string): ServerContext {
  const paths = resolveRepoPaths(fromDir);
  const registry = new MarketplaceRegistry({ marketplaceDir: paths.marketplaceDir, claudeDir: paths.claudeDir });
  return {
    paths,
    registry,
    agents: () => loadAgents(paths),
  };
}
