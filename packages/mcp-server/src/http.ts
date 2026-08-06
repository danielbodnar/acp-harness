/**
 * Streamable HTTP transport bootstrap. Serves MCP over a single `/mcp` endpoint using the
 * SDK's {@link StreamableHTTPServerTransport}.
 *
 * We follow the SDK's *stateless* pattern: a fresh {@link createServer} instance and a fresh
 * transport are created per request (no `Mcp-Session-Id`), which matches the modern MCP
 * transport shape and avoids cross-request state. Responses are returned as JSON.
 */

import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { createServer } from "./server.js";

const MCP_PATH = "/mcp";

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return undefined;
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

async function handleMcp(req: IncomingMessage, res: ServerResponse, fromDir?: string): Promise<void> {
  // Stateless: build a fresh server + transport for this request and tear them down after.
  const { server } = createServer(fromDir);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  const body = req.method === "POST" ? await readBody(req) : undefined;
  await transport.handleRequest(req, res, body);
}

export async function startHttpServer(port: number, fromDir?: string): Promise<void> {
  const http = createHttpServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (url.pathname === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok", server: "acp-harness-mcp" }));
      return;
    }

    if (url.pathname !== MCP_PATH) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: `Not found. MCP endpoint is ${MCP_PATH}` }));
      return;
    }

    void handleMcp(req, res, fromDir).catch((err) => {
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: (err as Error).message }));
      }
    });
  });

  await new Promise<void>((resolve) => http.listen(port, resolve));
  process.stderr.write(`[acp-harness-mcp] Streamable HTTP listening on http://localhost:${port}${MCP_PATH}\n`);
}
