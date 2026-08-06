/** Shared helpers for building MCP tool results. */

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * Build a tool result that carries both a human-readable JSON text block and machine-readable
 * `structuredContent`, which is also what ext-apps UIs consume.
 */
export function jsonResult(data: unknown, options: { isError?: boolean } = {}): CallToolResult {
  const result: CallToolResult = {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data as Record<string, unknown>,
  };
  if (options.isError) result.isError = true;
  return result;
}
