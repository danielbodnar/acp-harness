/**
 * The marketplace registry: loads the Claude Code compatible catalog, classifies each entry
 * by provider, resolves local plugin directories, and discovers the Agent Skills bundled
 * inside them.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

import { parseFrontmatter } from "./frontmatter.js";
import { resolveRepoPaths } from "./paths.js";
import type {
  BundledSkill,
  GitHubSource,
  KnownMarketplace,
  MarketplaceCatalog,
  PluginEntry,
  PluginProvider,
  ResolvedPlugin,
} from "./types.js";

export interface MarketplaceRegistryOptions {
  /** Directory containing `.claude-plugin/marketplace.json`. Auto-detected when omitted. */
  marketplaceDir?: string;
  /** Directory containing `.claude/settings.json` for extra known marketplaces. */
  claudeDir?: string;
}

/** Suggested marketplaces we recommend but do not enable by default. */
const SUGGESTED_MARKETPLACES: KnownMarketplace[] = [
  {
    name: "claude-plugins-official",
    source: "anthropics/claude-plugins-official",
    kind: "suggested",
    description: "Anthropic-managed directory of high-quality Claude Code plugins.",
  },
  {
    name: "anthropic-agent-skills",
    source: "anthropics/skills",
    kind: "suggested",
    description: "Anthropic's public Agent Skills (document skills and examples).",
  },
];

export class MarketplaceRegistry {
  private readonly marketplaceDir: string;
  private readonly claudeDir?: string;

  constructor(options: MarketplaceRegistryOptions = {}) {
    if (options.marketplaceDir) {
      this.marketplaceDir = resolve(options.marketplaceDir);
      this.claudeDir = options.claudeDir ? resolve(options.claudeDir) : undefined;
    } else {
      const paths = resolveRepoPaths();
      this.marketplaceDir = paths.marketplaceDir;
      this.claudeDir = options.claudeDir ? resolve(options.claudeDir) : paths.claudeDir;
    }
  }

  get catalogFile(): string {
    return join(this.marketplaceDir, ".claude-plugin", "marketplace.json");
  }

  /** Read and parse the raw catalog file. */
  loadCatalog(): MarketplaceCatalog {
    const raw = readFileSync(this.catalogFile, "utf8");
    const catalog = JSON.parse(raw) as MarketplaceCatalog;
    if (!Array.isArray(catalog.plugins)) {
      throw new Error(`Invalid marketplace catalog: missing "plugins" array in ${this.catalogFile}`);
    }
    return catalog;
  }

  /** Load and fully resolve every plugin in the catalog. */
  listPlugins(): ResolvedPlugin[] {
    const catalog = this.loadCatalog();
    const pluginRoot = catalog.metadata?.pluginRoot;
    return catalog.plugins.map((entry) => this.resolvePlugin(entry, pluginRoot));
  }

  /** Find a single plugin by name. */
  getPlugin(name: string): ResolvedPlugin | undefined {
    return this.listPlugins().find((p) => p.name === name);
  }

  /** Case-insensitive keyword search across name, description, and keywords. */
  search(term: string): ResolvedPlugin[] {
    const needle = term.trim().toLowerCase();
    if (!needle) return this.listPlugins();
    return this.listPlugins().filter((p) => {
      const haystack = [p.name, p.description, ...p.keywords].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }

  /** All skills across all locally-resolvable plugins. */
  listSkills(): BundledSkill[] {
    return this.listPlugins().flatMap((p) => p.skills);
  }

  /** Fetch a skill's full content (frontmatter data + markdown body) by skill name. */
  getSkill(name: string): { skill: BundledSkill; data: Record<string, string>; body: string } | undefined {
    const skill = this.listSkills().find((s) => s.name === name);
    if (!skill) return undefined;
    const { data, body } = parseFrontmatter(readFileSync(skill.path, "utf8"));
    return { skill, data, body };
  }

  /**
   * Known + suggested marketplaces. "known" entries are read from
   * `.claude/settings.json` (`extraKnownMarketplaces`); "suggested" are our recommendations.
   */
  listMarketplaces(): KnownMarketplace[] {
    return [...this.readExtraKnownMarketplaces(), ...SUGGESTED_MARKETPLACES];
  }

  // -- internals ------------------------------------------------------------

  private resolvePlugin(entry: PluginEntry, pluginRoot?: string): ResolvedPlugin {
    const provider = classifyProvider(entry);
    const localPath = this.resolveLocalPath(entry, pluginRoot);
    const skills = localPath ? discoverSkills(localPath, entry.name) : [];
    return {
      name: entry.name,
      provider,
      description: entry.description ?? "",
      version: entry.version,
      category: entry.category,
      keywords: entry.keywords ?? [],
      source: entry.source,
      localPath,
      agent: entry.agent,
      skills,
    };
  }

  private resolveLocalPath(entry: PluginEntry, pluginRoot?: string): string | undefined {
    if (typeof entry.source !== "string") return undefined; // github/object sources aren't local
    // pluginRoot shortcut: a bare name resolves under metadata.pluginRoot.
    const raw = entry.source;
    const candidate = isAbsolute(raw)
      ? raw
      : raw.startsWith("./") || raw.startsWith("../")
        ? join(this.marketplaceDir, raw)
        : join(this.marketplaceDir, pluginRoot ?? ".", raw);
    return existsSync(candidate) && statSync(candidate).isDirectory() ? candidate : undefined;
  }

  private readExtraKnownMarketplaces(): KnownMarketplace[] {
    if (!this.claudeDir) return [];
    const settingsFile = join(this.claudeDir, "settings.json");
    if (!existsSync(settingsFile)) return [];
    try {
      const settings = JSON.parse(readFileSync(settingsFile, "utf8")) as {
        extraKnownMarketplaces?: Record<string, { source?: { source?: string; repo?: string } }>;
      };
      const extra = settings.extraKnownMarketplaces ?? {};
      return Object.entries(extra).map(([name, value]) => {
        const src = value?.source;
        const source = src?.repo ?? src?.source ?? name;
        return { name, source, kind: "known" as const };
      });
    } catch {
      return [];
    }
  }
}

/** Classify a plugin entry into one of the three provider kinds. */
export function classifyProvider(entry: PluginEntry): PluginProvider {
  if (entry.provider) return entry.provider;
  const source = entry.source;
  if (typeof source === "object" && source && (source as GitHubSource).source === "github") {
    return "github";
  }
  if (entry.agent) return "generic-agent";
  return "claude";
}

/** Discover skills under `<pluginDir>/skills/<name>/SKILL.md`. */
export function discoverSkills(pluginDir: string, pluginName: string): BundledSkill[] {
  const skillsDir = join(pluginDir, "skills");
  if (!existsSync(skillsDir) || !statSync(skillsDir).isDirectory()) return [];
  const out: BundledSkill[] = [];
  for (const dirent of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const skillFile = join(skillsDir, dirent.name, "SKILL.md");
    if (!existsSync(skillFile)) continue;
    const { data } = parseFrontmatter(readFileSync(skillFile, "utf8"));
    out.push({
      name: data.name ?? dirent.name,
      description: data.description ?? "",
      path: skillFile,
      plugin: pluginName,
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
