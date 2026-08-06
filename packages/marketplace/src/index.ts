/**
 * @acp/marketplace — a Claude Code compatible, multi-provider plugin marketplace registry.
 *
 * The catalog file (`marketplace/.claude-plugin/marketplace.json`) is a valid Claude Code
 * marketplace, and this registry additionally classifies each entry by provider
 * (`claude` / `github` / `generic-agent`) and discovers bundled Agent Skills.
 */

export * from "./types.js";
export * from "./frontmatter.js";
export * from "./paths.js";
export * from "./registry.js";
