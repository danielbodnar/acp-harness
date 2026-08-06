---
name: marketplace-curator
description: Curate a multi-provider Claude Code plugin marketplace. Use when adding, classifying, or validating plugins in marketplace.json, wiring bundled skills, or managing known and suggested extra marketplaces for Claude, GitHub, and generic ACP agent providers.
---

# Marketplace Curator

Maintain `marketplace/.claude-plugin/marketplace.json` as both a valid Claude Code catalog
and a provider-aware registry.

## Catalog shape

```jsonc
{
  "name": "acp-harness-marketplace",
  "owner": { "name": "…" },
  "metadata": { "pluginRoot": "./plugins" },
  "plugins": [ /* entries */ ]
}
```

With `metadata.pluginRoot: "./plugins"`, an entry may use `"source": "acp-harness-skills"`
instead of the full relative path.

## The three providers

Classify every entry as exactly one provider. The registry infers it, but set `provider`
explicitly to be safe:

- **`claude`** — a local Claude plugin (relative-path `source`) that ships skills, agents,
  hooks, commands, and/or an `.mcp.json`.
- **`github`** — `"source": { "source": "github", "repo": "owner/name" }`. For agent
  plugins, add an `agent` launch descriptor so the harness can run it.
- **`generic-agent`** — a provider-agnostic ACP agent template carrying an `agent`
  descriptor (`{ "command", "args" }`).

## Adding a plugin

1. Create `plugins/<name>/.claude-plugin/plugin.json` (`name`, `version`, `description`).
2. For skills, add `plugins/<name>/skills/<skill>/SKILL.md` (see `mcp-app-builder`).
3. For an MCP server, add `plugins/<name>/.mcp.json`.
4. Add a catalog entry with `name`, `source`, `description`, `provider`, and `keywords`.

## Known vs suggested marketplaces

- **Known**: enabled via `.claude/settings.json` → `extraKnownMarketplaces`.
- **Suggested**: recommendations the registry advertises but does not enable.

List both with `acp-harness plugins marketplaces` or the `marketplace_list_marketplaces`
MCP tool.

## Validate

```bash
acp-harness plugins list          # resolves every entry + provider + skills
claude plugin validate .          # (inside Claude Code) schema + rename-chain checks
```

Reserved marketplace names (do not use): `claude-code-marketplace`, `claude-code-plugins`,
`claude-plugins-official`, `anthropic-marketplace`, `anthropic-plugins`.
