## 1. Workspace scaffolding
- [x] 1.1 Root `package.json` (npm workspaces), `tsconfig.base.json`, project references
- [x] 1.2 `.gitignore`, `.editorconfig`, `LICENSE`, top-level `README.md`
- [x] 1.3 OpenSpec `config.yaml`, `project.md`, and source-of-truth specs

## 2. ACP client core (`acp-client`)
- [x] 2.1 ndjson JSON-RPC 2.0 peer (framing, request/response correlation, notifications)
- [x] 2.2 ACP protocol types and method constants
- [x] 2.3 `AcpClient`: initialize, session/new, session/prompt, session/cancel
- [x] 2.4 Client-side handlers: fs read/write, request_permission, session/update stream

## 3. Reference agent (`mock-agent`)
- [x] 3.1 Minimal ACP agent: initialize, session/new, session/prompt
- [x] 3.2 Stream message chunks, a tool call, and a plan; return a stop reason

## 4. CLI/TUI harness (`harness`)
- [x] 4.1 Agent registry loader for `config/agents.json`
- [x] 4.2 `agents` (list), `run` (one-shot), and `tui` (interactive) commands
- [x] 4.3 Streaming renderer for session updates

## 5. Marketplace (`marketplace` + `marketplace/` content)
- [x] 5.1 Provider model and registry (classify claude/github/generic-agent)
- [x] 5.2 Bundled-skill discovery via SKILL.md frontmatter
- [x] 5.3 `.claude-plugin/marketplace.json` catalog + example plugins
- [x] 5.4 Curated skills (`acp-session-runner`, `marketplace-curator`, `mcp-app-builder`)
- [x] 5.5 `.claude/settings.json` known + suggested extra marketplaces

## 6. MCP 2.0 server (`mcp-server`)
- [x] 6.1 Build `McpServer`, stdio + Streamable HTTP transports
- [x] 6.2 ACP tools (`acp_list_agents`, `acp_run_prompt`)
- [x] 6.3 Marketplace tools (`marketplace_*`) and skills tools (`skills_*`)
- [x] 6.4 ext-apps dashboard resource (`ui://…`) + linked tool

## 7. Verify
- [x] 7.1 `tsc -b` builds the whole workspace
- [x] 7.2 End-to-end harness run against the mock agent
- [x] 7.3 MCP server smoke test (tools/list, tool call, resource read)
- [x] 7.4 `openspec validate --all --strict` passes
