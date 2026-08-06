# ACP Harness

A **vendor-agnostic [Agent Client Protocol](https://agentclientprotocol.com) (ACP) harness**
and the ecosystem around it:

1. **CLI/TUI harness** that speaks ACP to *any* compliant coding agent over stdio.
2. **Multi-provider plugin marketplace** — Claude, GitHub, and generic-agent plugins.
3. **Curated specialized skills** bundled as plugins and registered in that marketplace,
   alongside known and suggested extra marketplaces.
4. **MCP 2.0 server** exposing the harness, marketplace, and skills as MCP tools/resources,
   including **ext-apps** ([MCP Apps](https://github.com/modelcontextprotocol/ext-apps),
   `io.modelcontextprotocol/ui`) interactive UI.

Everything is spec-driven: see [`openspec/`](./openspec) for the source-of-truth specs and
the `bootstrap-acp-harness` change that introduced them.

> **Why?** ACP is to coding agents what LSP was to language servers: one standard, N editors,
> M agents, instead of N×M bespoke integrations. This repo lets you drive Gemini CLI, Claude
> Code, Codex, or your own in-house agent through one harness — and expose all of it to any
> MCP host.

## Quick start

```bash
npm install
npm run build
npm test          # build + full end-to-end verification (ACP + marketplace + MCP)
```

### Drive an ACP agent (CLI)

```bash
node packages/harness/dist/index.js agents                 # list configured agents
node packages/harness/dist/index.js run mock "What is ACP?" # one-shot against the bundled mock agent
node packages/harness/dist/index.js tui gemini             # interactive session
node packages/harness/dist/index.js plugins list           # browse the marketplace
```

The bundled **mock agent** implements ACP end-to-end, so the harness works with **no network
and no third-party agent installed**. Point `config/agents.json` at real agents (Gemini CLI,
`claude-code-acp`, `codex-acp`, …) to use them.

### Run the MCP server

```bash
node packages/mcp-server/dist/index.js            # stdio (default)
node packages/mcp-server/dist/index.js --http 3339 # Streamable HTTP at http://localhost:3339/mcp
```

## Architecture

```
packages/
  acp-client   Vendor-agnostic ACP client: ndjson JSON-RPC 2.0 over stdio (no vendor SDK)
  mock-agent   Reference ACP agent for offline end-to-end testing
  harness      CLI/TUI that drives any ACP agent via acp-client
  marketplace  Multi-provider marketplace registry (claude | github | generic-agent)
  mcp-server   MCP 2.0 server (stdio + Streamable HTTP) exposing everything, with ext-apps

marketplace/   The Claude Code plugin marketplace (catalog + plugins + bundled skills)
config/        agents.json — the ACP agent registry used by the harness
.claude/       settings.json wiring known + suggested extra marketplaces
openspec/      Specs (source of truth), changes, and proposals
scripts/       verify.mjs — the end-to-end verification used by `npm test`
```

### How the pieces connect

- The **harness** reads `config/agents.json`, spawns an ACP agent subprocess, negotiates
  capabilities (`initialize`), opens a session (`session/new`), and drives it
  (`session/prompt`), rendering streamed `session/update` notifications.
- The **marketplace** registry parses `marketplace/.claude-plugin/marketplace.json`,
  classifies each entry by provider, and discovers the Agent Skills bundled in each plugin.
- The **MCP server** reuses `acp-client` and `marketplace` to expose tools and an ext-apps
  dashboard resource (`ui://acp-harness/dashboard.html`).

## The MCP 2.0 server

Built on the official [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol)
and [`@modelcontextprotocol/ext-apps`](https://github.com/modelcontextprotocol/ext-apps).

| Tool | Purpose |
| --- | --- |
| `acp_list_agents` | List configured ACP agents |
| `acp_run_prompt` | Spawn an agent, run one prompt, return text + tool calls + stop reason |
| `marketplace_list_plugins` | List plugins with provider + skills |
| `marketplace_search` | Keyword search |
| `marketplace_plugin_info` | Inspect one plugin |
| `marketplace_list_marketplaces` | Known + suggested marketplaces |
| `marketplace_install_plan` | Dry-run install commands |
| `skills_list` / `skills_get` | List / read bundled skills |
| `open_marketplace_dashboard` | **ext-apps** View → `ui://acp-harness/dashboard.html` |

The dashboard is a real MCP App: the resource uses the `ui://` scheme with MIME type
`text/html;profile=mcp-app`, and the tool links to it via `_meta.ui.resourceUri`. Capable
hosts (Claude, ChatGPT, VS Code, Goose, …) render it in a sandboxed iframe; other hosts still
get the tool's structured JSON.

Transports:

- **stdio** (default) — for local MCP hosts (Claude Desktop, VS Code, Zed, …).
- **Streamable HTTP** (`--http [port]`) — stateless, single `/mcp` endpoint, JSON responses.

## The plugin marketplace

[`marketplace/`](./marketplace) is a valid Claude Code marketplace **and** a provider-aware
registry:

| Provider | Example |
| --- | --- |
| `claude` | `acp-harness-skills` (bundles the curated skills + the MCP server) |
| `github` | `gemini-cli-acp`, `claude-code-acp` |
| `generic-agent` | `generic-acp-agent` (template for any ACP agent binary) |

```
/plugin marketplace add <path-or-owner/repo>
/plugin install acp-harness-skills@acp-harness-marketplace
```

Known and suggested extra marketplaces live in [`.claude/settings.json`](./.claude/settings.json)
(`extraKnownMarketplaces`) and the registry's suggested list.

## Curated skills

Portable [Agent Skills](https://agentskills.io) (`SKILL.md`) bundled in `acp-harness-skills`:

- **acp-session-runner** — run and debug ACP agents through the harness.
- **marketplace-curator** — add, classify, and validate marketplace plugins.
- **mcp-app-builder** — add an ext-apps (MCP Apps) UI to an MCP server.

## Spec-driven development (OpenSpec)

```bash
npx --yes @fission-ai/openspec@latest validate --all --strict   # or: openspec validate --all --strict
```

Specs are the source of truth. Propose changes under `openspec/changes/<name>/` before
implementing; archive them into `openspec/specs/` once shipped.

## Requirements

- Node.js ≥ 20 (developed on 22). TypeScript, ESM, npm workspaces.

## License

MIT — see [LICENSE](./LICENSE).
