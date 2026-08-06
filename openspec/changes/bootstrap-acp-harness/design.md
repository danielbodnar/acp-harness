## Context

ACP is JSON-RPC 2.0 between an editor (client) and a coding agent, transported as
newline-delimited JSON over the agent subprocess's stdio. MCP is the complementary
protocol between an agent and its tools; "MCP 2.0" here means modern MCP: Streamable HTTP
transport, capability/extension negotiation, and the MCP Apps extension
(`io.modelcontextprotocol/ui`, a.k.a. ext-apps) for interactive HTML UIs rendered by the
host in a sandboxed iframe.

## Goals / Non-Goals

**Goals:**
- A dependency-light ACP core that works with any compliant agent.
- Faithful use of the *real* MCP + ext-apps SDKs so the server is a valid MCP 2.0 server.
- A marketplace that is simultaneously a valid Claude Code catalog and a richer,
  provider-aware registry.
- The whole thing must build and run offline (via the bundled mock agent).

**Non-Goals:**
- Remote ACP transports; a bespoke TUI toolkit; real Claude config mutation on install.

## Decisions

- **Implement ACP directly, not via a vendor SDK.** Keeps the harness truly vendor-agnostic
  and lets it target the wire protocol (ndjson JSON-RPC) rather than one agent's API.
- **Use the official MCP TypeScript SDK (`@modelcontextprotocol/sdk`) and
  `@modelcontextprotocol/ext-apps`.** The MCP surface is large and security-sensitive;
  reusing the reference SDK is safer than reimplementing it. ext-apps helpers
  (`registerAppTool`, `registerAppResource`, `RESOURCE_MIME_TYPE`) give us correct UI
  metadata and the `text/html;profile=mcp-app` MIME type for free.
- **TypeScript project references (`tsc -b`).** Deterministic build ordering across the
  workspace; each package emits `dist/` consumed via package `exports`.
- **Marketplace as a superset of the Claude schema.** The catalog stays valid for Claude
  Code, but entries may carry a `provider` field and an `agent` launch descriptor that the
  registry uses to model `claude` / `github` / `generic-agent` providers.
- **Bundle a mock ACP agent.** Enables real end-to-end verification (`initialize` →
  `session/new` → `session/prompt` → streamed updates) with no network or third-party agent.

## Risks / Trade-offs

- The ndjson framing assumption must match agents in the wild; we tolerate malformed lines
  and document the framing. (Reference agents such as Zed's use ndjson.)
- ext-apps is an extension whose host support varies; the dashboard degrades to returning
  structured JSON when a host does not render MCP Apps.
- Pinning to current SDK majors means periodic dependency bumps; mitigated by isolating SDK
  usage inside `mcp-server`.
