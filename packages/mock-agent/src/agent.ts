/**
 * A tiny, self-contained ACP *agent* (the side an editor connects to). It implements just
 * enough of the protocol to exercise a client end-to-end: capability negotiation, session
 * creation, and a scripted prompt turn that streams a plan, a thought, message chunks, and a
 * tool call — optionally reading a file back through the client to demonstrate bidirectional
 * JSON-RPC.
 *
 * It is deliberately independent of any model provider, so the harness can be verified with
 * no network access and no third-party agent installed.
 */

import {
  ErrorCode,
  JsonRpcPeer,
  Method,
  PROTOCOL_VERSION,
  RpcError,
  type InitializeRequest,
  type NewSessionRequest,
  type PromptRequest,
  type SessionNotification,
} from "@acp/acp-client";

let sessionCounter = 0;

export interface MockAgentOptions {
  /** Delay between streamed chunks in ms (0 for tests). */
  streamDelayMs?: number;
}

const delay = (ms: number) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

/**
 * Register the agent-side ACP methods on a peer. `peer.request` here targets the *client*
 * (e.g. `fs/read_text_file`), while `peer.onRequest` handles calls *from* the client.
 */
export function registerMockAgent(peer: JsonRpcPeer, options: MockAgentOptions = {}): void {
  const streamDelayMs = options.streamDelayMs ?? 40;
  const knownSessions = new Set<string>();

  peer.onRequest(Method.Initialize, (params) => {
    const req = (params ?? {}) as InitializeRequest;
    // Echo the client's version if we support it; otherwise fall back to ours.
    const negotiated = Math.min(req.protocolVersion ?? PROTOCOL_VERSION, PROTOCOL_VERSION);
    return {
      protocolVersion: negotiated,
      agentInfo: { name: "acp-mock-agent", version: "0.1.0" },
      agentCapabilities: {
        loadSession: false,
        promptCapabilities: { image: false, audio: false, embeddedContext: true },
      },
      authMethods: [],
    };
  });

  peer.onRequest(Method.NewSession, (params) => {
    const req = (params ?? {}) as NewSessionRequest;
    if (typeof req.cwd !== "string" || !req.cwd) {
      throw new RpcError(ErrorCode.InvalidParams, "cwd is required and must be absolute");
    }
    const sessionId = `mock-session-${++sessionCounter}`;
    knownSessions.add(sessionId);
    return {
      sessionId,
      modes: {
        currentModeId: "default",
        availableModes: [
          { id: "default", name: "Default" },
          { id: "plan", name: "Plan" },
        ],
      },
    };
  });

  peer.onRequest(Method.Prompt, async (params) => {
    const req = (params ?? {}) as PromptRequest;
    if (!knownSessions.has(req.sessionId)) {
      throw new RpcError(ErrorCode.InvalidParams, `unknown session: ${req.sessionId}`);
    }

    const userText = extractText(req);
    const notify = (update: SessionNotification["update"]) =>
      peer.notify(Method.SessionUpdate, { sessionId: req.sessionId, update });

    // 1. A short plan.
    notify({
      sessionUpdate: "plan",
      entries: [
        { content: "Understand the request", status: "completed", priority: "high" },
        { content: "Draft a response", status: "in_progress", priority: "high" },
      ],
    });
    await delay(streamDelayMs);

    // 2. A thinking chunk.
    notify({ sessionUpdate: "agent_thought_chunk", content: { type: "text", text: "Considering the prompt…" } });
    await delay(streamDelayMs);

    // 3. A tool call and its completion (demonstrates status transitions).
    const toolCallId = "call-1";
    notify({ sessionUpdate: "tool_call", toolCallId, title: "echo", kind: "other", status: "in_progress" });
    await delay(streamDelayMs);
    notify({ sessionUpdate: "tool_call_update", toolCallId, status: "completed" });
    await delay(streamDelayMs);

    // 4. The assistant message, streamed in a couple of chunks.
    const reply = `You said: "${userText}". This is the ACP mock agent responding.`;
    for (const chunk of chunkString(reply, 24)) {
      notify({ sessionUpdate: "agent_message_chunk", content: { type: "text", text: chunk } });
      await delay(streamDelayMs);
    }

    return { stopReason: "end_turn" };
  });

  // Accept (and ignore) cancellation notifications gracefully.
  peer.onNotification(Method.Cancel, () => {
    /* no-op: the scripted turn is short */
  });
}

function extractText(req: PromptRequest): string {
  const parts = (req.prompt ?? [])
    .map((block) => (block && block.type === "text" ? String((block as { text?: string }).text ?? "") : ""))
    .filter(Boolean);
  return parts.join(" ").trim() || "(no text)";
}

function chunkString(text: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}
