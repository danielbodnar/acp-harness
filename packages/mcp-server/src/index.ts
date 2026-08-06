/**
 * acp-harness-mcp entry point.
 *
 * Usage:
 *   acp-harness-mcp                 Serve MCP over stdio (default)
 *   acp-harness-mcp --http [port]   Serve MCP over Streamable HTTP (default port 3339)
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { startHttpServer } from "./http.js";
import { createServer } from "./server.js";

export { createServer, SERVER_INFO } from "./server.js";
export { buildCatalogSnapshot, DASHBOARD_URI } from "./apps/dashboard.js";

async function runStdio(): Promise<void> {
  const { server } = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("[acp-harness-mcp] serving MCP over stdio\n");
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const httpIndex = argv.indexOf("--http");
  if (httpIndex !== -1) {
    const portArg = argv[httpIndex + 1];
    const port = portArg && /^\d+$/.test(portArg) ? Number(portArg) : 3339;
    await startHttpServer(port);
    return;
  }
  await runStdio();
}

// Only auto-run when executed as a program (not when imported by tests).
const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (invokedDirectly) {
  main().catch((err) => {
    process.stderr.write(`[acp-harness-mcp] fatal: ${(err as Error).message}\n`);
    process.exit(1);
  });
}
