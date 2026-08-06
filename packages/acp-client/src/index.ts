/**
 * @acp/acp-client — a vendor-agnostic Agent Client Protocol (ACP) client.
 *
 * ACP is JSON-RPC 2.0 between an editor (client) and a coding agent, framed as
 * newline-delimited JSON over the agent subprocess's stdio. This package implements the
 * client side of that contract without depending on any single agent vendor's SDK.
 */

export * from "./jsonrpc.js";
export * from "./protocol.js";
export * from "./client.js";
export * from "./spawn.js";
