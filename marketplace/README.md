# ACP Harness Marketplace

A multi-provider plugin marketplace. The catalog at
[`.claude-plugin/marketplace.json`](./.claude-plugin/marketplace.json) is a valid **Claude
Code** marketplace, and the `@acp/marketplace` registry additionally classifies each entry
by **provider**.

## Providers

| Provider | What it is | Example entry |
| --- | --- | --- |
| `claude` | Local Claude plugin (skills / MCP / hooks) | `acp-harness-skills` |
| `github` | Plugin sourced from a GitHub repo | `gemini-cli-acp`, `claude-code-acp` |
| `generic-agent` | Provider-agnostic ACP agent template | `generic-acp-agent` |

## Plugins

- **acp-harness-skills** (`claude`) — bundles the curated skills
  (`acp-session-runner`, `marketplace-curator`, `mcp-app-builder`) and wires the ACP Harness
  MCP server via `.mcp.json`.
- **gemini-cli-acp** (`github`) — Google's Gemini CLI as an ACP agent (`--experimental-acp`).
- **claude-code-acp** (`github`) — Claude Code over ACP via the `claude-code-acp` adapter.
- **generic-acp-agent** (`generic-agent`) — a template for any ACP agent binary.

## Add & install (Claude Code)

```text
/plugin marketplace add <path-to-this-marketplace-dir OR owner/repo>
/plugin install acp-harness-skills@acp-harness-marketplace
```

## Browse programmatically

```bash
acp-harness plugins list          # plugins + provider + skills
acp-harness plugins skills        # bundled skills
acp-harness plugins marketplaces  # known + suggested marketplaces
```

Known and suggested extra marketplaces are configured in
[`../.claude/settings.json`](../.claude/settings.json).
