# Project: acp-harness

A vendor-agnostic **Agent Client Protocol (ACP)** harness plus the ecosystem around it:

1. **CLI/TUI harness** that speaks ACP to *any* compliant coding agent over stdio.
2. **Multi-provider plugin marketplace** (Claude, GitHub, and generic-agent plugins).
3. **Curated specialized skills** bundled as plugins and registered in that marketplace,
   alongside known and suggested extra marketplaces.
4. **MCP 2.0 server** that exposes the harness, marketplace, and skills as MCP tools and
   resources, including **ext-apps** (MCP Apps, `io.modelcontextprotocol/ui`) interactive UI.

## Architecture

```
packages/
  acp-client   ACP JSON-RPC (ndjson) client library — the vendor-agnostic core
  mock-agent   Reference ACP agent used for local end-to-end testing
  harness      CLI/TUI that drives any ACP agent via acp-client
  marketplace  Multi-provider marketplace registry + provider model
  mcp-server   MCP 2.0 server (stdio + Streamable HTTP) exposing everything, with ext-apps

marketplace/   The actual Claude Code plugin marketplace (catalog + plugins + skills)
config/        agents.json — the ACP agent registry used by the harness
.claude/       settings.json wiring known + suggested extra marketplaces
openspec/      Specs (source of truth), changes, and proposals
```

## How the pieces connect

- The **harness** reads `config/agents.json`, spawns an ACP agent subprocess, negotiates
  capabilities via `initialize`, opens a session with `session/new`, and drives it with
  `session/prompt`, rendering streamed `session/update` notifications in the CLI/TUI.
- The **marketplace** package parses `marketplace/.claude-plugin/marketplace.json`,
  classifies each entry by provider (`claude` / `github` / `generic-agent`), and resolves
  the skills bundled in each plugin.
- The **MCP server** re-uses `acp-client` and `marketplace` to expose tools
  (`acp_*`, `marketplace_*`, `skills_*`) and an ext-apps dashboard resource
  (`ui://acp-harness/dashboard.html`).

## Conventions

- TypeScript ESM (NodeNext); relative imports carry `.js` extensions.
- `tsc -b` project references; each package emits to `dist/`.
- Conventional Commits.
- Specs are the source of truth — see `openspec/specs/`.
