## Why

AI coding agents and editors are tightly coupled: every editor must build a custom
integration for every agent. ACP (the Agent Client Protocol) fixes this the way LSP fixed
language tooling — one standard, N clients, M agents. We want a single, vendor-agnostic
harness that can drive *any* ACP agent, plus the surrounding ecosystem (a plugin
marketplace, curated skills, and an MCP server) so the harness is useful out of the box and
composable with MCP hosts.

## What Changes

- Add a vendor-agnostic **ACP client** library (ndjson JSON-RPC 2.0 over stdio) and a
  reference **mock agent** for end-to-end testing.
- Add a **CLI/TUI harness** that lists agents, runs one-shot prompts, and offers an
  interactive session, rendering streamed updates and handling client-side requests.
- Add a **multi-provider plugin marketplace** (Claude / GitHub / generic-agent) with a
  registry that classifies plugins and discovers bundled skills, plus known and suggested
  extra marketplaces.
- Add a curated set of **Agent Skills** (`acp-session-runner`, `marketplace-curator`,
  `mcp-app-builder`) bundled as a marketplace plugin.
- Add an **MCP 2.0 server** (stdio + Streamable HTTP) exposing ACP control, marketplace,
  and skills tools, plus an **ext-apps** dashboard UI resource.

## Capabilities

### New Capabilities
- `acp-harness`: vendor-agnostic ACP transport, session lifecycle, and CLI/TUI.
- `plugin-marketplace`: multi-provider Claude Code compatible marketplace and registry.
- `agent-skills`: portable curated skills bundled as plugins.
- `mcp-server`: MCP 2.0 server exposing everything with ext-apps support.

## Impact

- New monorepo packages: `acp-client`, `mock-agent`, `harness`, `marketplace`, `mcp-server`.
- New marketplace content under `marketplace/` and agent registry under `config/`.
- New host wiring under `.claude/settings.json`.
- Runtime dependencies: `@modelcontextprotocol/sdk`, `@modelcontextprotocol/ext-apps`, `zod`.

## Non-goals

- Implementing a full production TUI framework (we ship a dependency-light readline TUI).
- Remote ACP transports (HTTP/WebSocket) — the spec marks these a work in progress.
- Actually mutating a user's Claude Code config during install (the MCP install tool is a
  dry-run planner).
