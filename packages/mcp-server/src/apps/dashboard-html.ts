/**
 * The MCP Apps (ext-apps) dashboard View, as a self-contained HTML document.
 *
 * The server injects a live snapshot of the catalog at `resources/read` time by replacing
 * the `__ACP_SNAPSHOT__` marker, so the View renders real data in any host. It also listens
 * for host `postMessage` updates (the ext-apps bidirectional channel) and re-renders when the
 * linked tool's structured output arrives. For a production build you would bundle
 * `@modelcontextprotocol/ext-apps` (see the ext-apps Quickstart); this dependency-free View
 * keeps the scaffold buildable without a bundler while honoring the ui:// + MIME contract.
 */

export const SNAPSHOT_MARKER = "/*__ACP_SNAPSHOT__*/";

export const DASHBOARD_HTML_TEMPLATE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ACP Harness — Marketplace</title>
    <style>
      :root { color-scheme: light dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font: 14px/1.5 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        background: Canvas;
        color: CanvasText;
        padding: 16px;
      }
      h1 { font-size: 18px; margin: 0 0 2px; }
      h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; opacity: .7; margin: 20px 0 8px; }
      .sub { opacity: .65; margin: 0 0 8px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
      .card { border: 1px solid color-mix(in srgb, CanvasText 15%, transparent); border-radius: 10px; padding: 12px; }
      .card h3 { margin: 0 0 4px; font-size: 14px; }
      .card p { margin: 0; opacity: .8; font-size: 13px; }
      .tag { display: inline-block; font-size: 11px; padding: 1px 7px; border-radius: 999px; margin-right: 4px;
             border: 1px solid color-mix(in srgb, CanvasText 25%, transparent); }
      .tag.claude { background: color-mix(in srgb, #d97706 22%, transparent); }
      .tag.github { background: color-mix(in srgb, #6e7681 26%, transparent); }
      .tag.generic-agent { background: color-mix(in srgb, #2563eb 22%, transparent); }
      .tag.known { background: color-mix(in srgb, #16a34a 20%, transparent); }
      .tag.suggested { background: color-mix(in srgb, #a855f7 20%, transparent); }
      .skills { margin-top: 6px; font-size: 12px; opacity: .8; }
      code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
      .foot { margin-top: 22px; font-size: 11px; opacity: .55; }
    </style>
  </head>
  <body>
    <header>
      <h1>ACP Harness · Plugin Marketplace</h1>
      <p class="sub" id="subtitle">Loading…</p>
    </header>
    <main id="app"></main>
    <p class="foot" id="foot"></p>

    <script>
      // Live snapshot injected by the server at resources/read time.
      window.__ACP_SNAPSHOT__ = null;
      ${SNAPSHOT_MARKER}

      function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
        });
      }

      function render(data) {
        if (!data) return;
        var app = document.getElementById("app");
        var plugins = data.plugins || [];
        var skills = data.skills || [];
        var markets = data.marketplaces || [];
        document.getElementById("subtitle").textContent =
          plugins.length + " plugins · " + skills.length + " skills · " + markets.length + " marketplaces";

        var html = "";
        html += '<h2>Plugins</h2><div class="grid">';
        plugins.forEach(function (p) {
          html += '<div class="card"><h3>' + esc(p.name) + "</h3>";
          html += '<div><span class="tag ' + esc(p.provider) + '">' + esc(p.provider) + "</span>";
          if (p.version) html += '<span class="tag">v' + esc(p.version) + "</span>";
          html += "</div>";
          html += "<p>" + esc(p.description) + "</p>";
          if (p.skills && p.skills.length) html += '<div class="skills">skills: ' + esc(p.skills.join(", ")) + "</div>";
          if (p.agent) html += '<div class="skills">agent: <code>' + esc(p.agent) + "</code></div>";
          html += "</div>";
        });
        html += "</div>";

        html += '<h2>Bundled skills</h2><div class="grid">';
        skills.forEach(function (s) {
          html += '<div class="card"><h3>' + esc(s.name) + "</h3><p>" + esc(s.description) + "</p>";
          html += '<div class="skills">from ' + esc(s.plugin) + "</div></div>";
        });
        html += "</div>";

        html += '<h2>Known &amp; suggested marketplaces</h2><div class="grid">';
        markets.forEach(function (m) {
          html += '<div class="card"><h3>' + esc(m.name) + "</h3>";
          html += '<div><span class="tag ' + esc(m.kind) + '">' + esc(m.kind) + "</span></div>";
          html += "<p><code>" + esc(m.source) + "</code></p>";
          if (m.description) html += "<p>" + esc(m.description) + "</p>";
          html += "</div>";
        });
        html += "</div>";

        app.innerHTML = html;
        document.getElementById("foot").textContent =
          "ext-apps View · io.modelcontextprotocol/ui · rendered " + new Date().toLocaleString();
      }

      // Try to pull a catalog payload out of an arbitrary host postMessage envelope.
      function extractCatalog(msg) {
        if (!msg || typeof msg !== "object") return null;
        var candidates = [
          msg.catalog,
          msg.structuredContent,
          msg.data && msg.data.structuredContent,
          msg.params && msg.params.structuredContent,
          msg.result && msg.result.structuredContent,
          msg.toolResult && msg.toolResult.structuredContent,
        ];
        for (var i = 0; i < candidates.length; i++) {
          if (candidates[i] && (candidates[i].plugins || candidates[i].skills)) return candidates[i];
        }
        return null;
      }

      window.addEventListener("message", function (event) {
        var catalog = extractCatalog(event.data);
        if (catalog) render(catalog);
      });

      // Announce readiness to the host (part of the ext-apps handshake).
      try {
        window.parent.postMessage({ type: "mcp-app-ready", app: "acp-harness-dashboard" }, "*");
      } catch (e) {}

      // Render the injected snapshot immediately so the View is useful in any host.
      render(window.__ACP_SNAPSHOT__);
    </script>
  </body>
</html>
`;
