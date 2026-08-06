---
name: mcp-app-builder
description: Add an interactive ext-apps (MCP Apps) UI to an MCP server. Use when the user wants a tool to render a chart, form, or dashboard in the chat client via the io.modelcontextprotocol/ui extension, using ui:// resources and the text/html;profile=mcp-app MIME type.
---

# MCP App Builder (ext-apps)

MCP Apps (the `io.modelcontextprotocol/ui` extension, a.k.a. ext-apps) let an MCP server
ship an interactive HTML View that the host renders in a sandboxed iframe. The core pattern
is **Tool + UI Resource**, linked by the resource URI.

## The contract

1. **UI resource** — declared under the `ui://` scheme with MIME type
   `text/html;profile=mcp-app` (the SDK constant `RESOURCE_MIME_TYPE`).
2. **Tool linkage** — the tool references the resource via `_meta.ui.resourceUri`.
3. **Data flow** — calling the tool returns `structuredContent`; the host passes it to the
   View, and the View may call other tools back through the host over the same JSON-RPC.

## Minimal server (TypeScript)

```ts
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";

const URI = "ui://my-app/view.html";

registerAppResource(server, "My View", URI, { description: "…" }, async () => ({
  contents: [{ uri: URI, mimeType: RESOURCE_MIME_TYPE, text: HTML }],
}));

registerAppTool(
  server,
  "open_my_app",
  { title: "Open my app", description: "…", _meta: { ui: { resourceUri: URI } } },
  async () => ({
    content: [{ type: "text", text: "opened" }],
    structuredContent: { /* data the View renders */ },
  }),
);
```

See `packages/mcp-server/src/apps/` in this repo for a complete, dependency-free example
(`open_marketplace_dashboard` → `ui://acp-harness/dashboard.html`).

## The View (HTML)

- Sandboxed: no direct network unless you declare a CSP via `_meta.ui.csp`
  (`resourceDomains` for scripts/styles/images, `connectDomains` for fetch/WebSocket).
- Announce readiness to the host, then render the tool's `structuredContent` when it
  arrives via `postMessage`.
- For production, bundle `@modelcontextprotocol/ext-apps` (App class + React hooks) with
  Vite and `vite-plugin-singlefile` so the View is one self-contained HTML file.

## Verify

- `resources/list` shows your `ui://…` resource with the `text/html;profile=mcp-app` MIME type.
- The tool's `_meta.ui.resourceUri` equals the resource URI.
- Test in a host that supports MCP Apps (Claude, ChatGPT, VS Code, Goose) or the ext-apps
  `basic-host` example.
