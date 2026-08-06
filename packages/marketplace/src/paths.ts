/**
 * Locate the repository's well-known directories by walking up from a starting directory
 * until we find `marketplace/.claude-plugin/marketplace.json`. This lets the MCP server and
 * CLI find the marketplace and config regardless of where they are launched from.
 */

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export interface RepoPaths {
  repoRoot: string;
  /** Directory that contains `.claude-plugin/marketplace.json`. */
  marketplaceDir: string;
  /** Path to the marketplace catalog file. */
  catalogFile: string;
  /** Directory holding `agents.json`. */
  configDir: string;
  /** Directory holding `settings.json` (`.claude`). */
  claudeDir: string;
}

const CATALOG_REL = join("marketplace", ".claude-plugin", "marketplace.json");

export function findRepoRoot(fromDir: string = process.cwd()): string | undefined {
  let current = resolve(fromDir);
  for (;;) {
    if (existsSync(join(current, CATALOG_REL))) return current;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

export function resolveRepoPaths(fromDir?: string): RepoPaths {
  const repoRoot = findRepoRoot(fromDir);
  if (!repoRoot) {
    throw new Error(
      `Could not locate repository root (looked for ${CATALOG_REL}). ` +
        `Pass an explicit directory or run from inside the acp-harness repo.`,
    );
  }
  const marketplaceDir = join(repoRoot, "marketplace");
  return {
    repoRoot,
    marketplaceDir,
    catalogFile: join(marketplaceDir, ".claude-plugin", "marketplace.json"),
    configDir: join(repoRoot, "config"),
    claudeDir: join(repoRoot, ".claude"),
  };
}
