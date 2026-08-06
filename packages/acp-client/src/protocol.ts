/**
 * ACP (Agent Client Protocol) method names and a pragmatic subset of the wire types.
 *
 * Types intentionally cover the messages this harness exchanges rather than the full
 * schema. Fields we don't consume are permitted via index signatures / optionals so the
 * harness stays forward-compatible with agents that send extra data.
 *
 * Reference: https://agentclientprotocol.com/protocol/schema
 */

/** The ACP wire protocol version this harness targets. */
export const PROTOCOL_VERSION = 1;

/** Canonical ACP method names. */
export const Method = {
  // Agent methods (client -> agent)
  Initialize: "initialize",
  Authenticate: "authenticate",
  NewSession: "session/new",
  LoadSession: "session/load",
  Prompt: "session/prompt",
  SetMode: "session/set_mode",
  // Notifications
  Cancel: "session/cancel",
  SessionUpdate: "session/update",
  // Client methods (agent -> client)
  RequestPermission: "session/request_permission",
  ReadTextFile: "fs/read_text_file",
  WriteTextFile: "fs/write_text_file",
  CreateTerminal: "terminal/create",
} as const;

// ---------------------------------------------------------------------------
// Content blocks
// ---------------------------------------------------------------------------

export interface TextContentBlock {
  type: "text";
  text: string;
  [key: string]: unknown;
}

export interface ResourceLinkContentBlock {
  type: "resource_link";
  uri: string;
  name: string;
  mimeType?: string;
  [key: string]: unknown;
}

export type ContentBlock =
  | TextContentBlock
  | ResourceLinkContentBlock
  | { type: string; [key: string]: unknown };

/** Convenience constructor for a text content block. */
export function textBlock(text: string): TextContentBlock {
  return { type: "text", text };
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

export interface FileSystemCapabilities {
  readTextFile?: boolean;
  writeTextFile?: boolean;
}

export interface ClientCapabilities {
  fs?: FileSystemCapabilities;
  terminal?: boolean;
  [key: string]: unknown;
}

export interface AgentCapabilities {
  loadSession?: boolean;
  promptCapabilities?: { image?: boolean; audio?: boolean; embeddedContext?: boolean };
  mcpCapabilities?: { http?: boolean; sse?: boolean };
  [key: string]: unknown;
}

export interface Implementation {
  name: string;
  version: string;
}

// ---------------------------------------------------------------------------
// initialize
// ---------------------------------------------------------------------------

export interface InitializeRequest {
  protocolVersion: number;
  clientCapabilities?: ClientCapabilities;
  clientInfo?: Implementation;
}

export interface AuthMethod {
  id: string;
  name: string;
  description?: string | null;
}

export interface InitializeResponse {
  protocolVersion: number;
  agentCapabilities?: AgentCapabilities;
  agentInfo?: Implementation | null;
  authMethods?: AuthMethod[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// MCP server descriptors passed on session creation
// ---------------------------------------------------------------------------

export interface McpServerStdio {
  name: string;
  command: string;
  args?: string[];
  env?: { name: string; value: string }[];
}

export type McpServer = McpServerStdio | Record<string, unknown>;

// ---------------------------------------------------------------------------
// session/new + session/prompt
// ---------------------------------------------------------------------------

export interface NewSessionRequest {
  cwd: string;
  mcpServers: McpServer[];
  additionalDirectories?: string[];
}

export interface SessionModeState {
  currentModeId?: string;
  availableModes?: { id: string; name: string }[];
  [key: string]: unknown;
}

export interface NewSessionResponse {
  sessionId: string;
  modes?: SessionModeState | null;
  [key: string]: unknown;
}

export interface PromptRequest {
  sessionId: string;
  prompt: ContentBlock[];
}

export type StopReason =
  | "end_turn"
  | "max_tokens"
  | "max_turn_requests"
  | "refusal"
  | "cancelled"
  | string;

export interface PromptResponse {
  stopReason: StopReason;
  [key: string]: unknown;
}

export interface CancelNotification {
  sessionId: string;
}

// ---------------------------------------------------------------------------
// session/update notifications (agent -> client)
// ---------------------------------------------------------------------------

export type SessionUpdate =
  | { sessionUpdate: "agent_message_chunk"; content: ContentBlock }
  | { sessionUpdate: "agent_thought_chunk"; content: ContentBlock }
  | { sessionUpdate: "user_message_chunk"; content: ContentBlock }
  | {
      sessionUpdate: "tool_call";
      toolCallId: string;
      title?: string;
      kind?: string;
      status?: string;
      [key: string]: unknown;
    }
  | {
      sessionUpdate: "tool_call_update";
      toolCallId: string;
      status?: string;
      [key: string]: unknown;
    }
  | { sessionUpdate: "plan"; entries?: unknown[]; [key: string]: unknown }
  | { sessionUpdate: string; [key: string]: unknown };

export interface SessionNotification {
  sessionId: string;
  update: SessionUpdate;
}

// ---------------------------------------------------------------------------
// Client methods invoked by the agent
// ---------------------------------------------------------------------------

export interface ReadTextFileRequest {
  sessionId: string;
  path: string;
  line?: number | null;
  limit?: number | null;
}

export interface ReadTextFileResponse {
  content: string;
}

export interface WriteTextFileRequest {
  sessionId: string;
  path: string;
  content: string;
}

export interface PermissionOption {
  optionId: string;
  name: string;
  kind: "allow_once" | "allow_always" | "reject_once" | "reject_always" | string;
}

export interface RequestPermissionRequest {
  sessionId: string;
  toolCall: { toolCallId: string; title?: string; [key: string]: unknown };
  options: PermissionOption[];
}

export type RequestPermissionOutcome =
  | { outcome: "selected"; optionId: string }
  | { outcome: "cancelled" };

export interface RequestPermissionResponse {
  outcome: RequestPermissionOutcome;
}
