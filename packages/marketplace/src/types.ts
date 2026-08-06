/** Domain types for the multi-provider plugin marketplace. */

/** The three provider kinds this marketplace models. */
export type PluginProvider = "claude" | "github" | "generic-agent";

/** A GitHub source object as understood by Claude Code marketplaces. */
export interface GitHubSource {
  source: "github";
  repo: string;
  ref?: string;
}

/** A plugin's `source` in the catalog: a relative path or a structured source object. */
export type PluginSource = string | GitHubSource | { source: string; [key: string]: unknown };

/** An ACP agent launch descriptor carried by agent-style plugins. */
export interface AgentDescriptor {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

/** A raw plugin entry as it appears in `.claude-plugin/marketplace.json`. */
export interface PluginEntry {
  name: string;
  source: PluginSource;
  description?: string;
  version?: string;
  category?: string;
  keywords?: string[];
  author?: { name?: string; email?: string };
  /** Non-standard (superset) hint used to force provider classification. */
  provider?: PluginProvider;
  /** Non-standard (superset) ACP agent launch descriptor for agent-style plugins. */
  agent?: AgentDescriptor;
  [key: string]: unknown;
}

/** The raw marketplace catalog file. */
export interface MarketplaceCatalog {
  name: string;
  owner?: { name?: string; email?: string };
  metadata?: { description?: string; version?: string; pluginRoot?: string };
  plugins: PluginEntry[];
}

/** A skill discovered inside a plugin. */
export interface BundledSkill {
  name: string;
  description: string;
  /** Absolute path to the SKILL.md file. */
  path: string;
  /** The plugin that owns this skill. */
  plugin: string;
}

/** A plugin after classification and (where possible) local resolution. */
export interface ResolvedPlugin {
  name: string;
  provider: PluginProvider;
  description: string;
  version?: string;
  category?: string;
  keywords: string[];
  source: PluginSource;
  /** Absolute path to the plugin directory, when it resolves locally. */
  localPath?: string;
  /** ACP agent launch descriptor for github/generic-agent plugins, when declared. */
  agent?: AgentDescriptor;
  /** Skills bundled inside the plugin (only discoverable for local plugins). */
  skills: BundledSkill[];
}

/** A known or suggested extra marketplace. */
export interface KnownMarketplace {
  name: string;
  /** GitHub `owner/repo` or a URL. */
  source: string;
  kind: "known" | "suggested";
  description?: string;
}
