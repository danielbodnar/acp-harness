/**
 * {@link AcpClient} — the editor/client side of ACP. It negotiates capabilities, manages
 * sessions, sends prompts, and answers agent-initiated requests (filesystem access and
 * permission prompts). It is transport-agnostic: give it a {@link JsonRpcPeer} and it works
 * over any stream (a subprocess in production, in-memory pipes in tests).
 */

import { ErrorCode, JsonRpcPeer, RpcError } from "./jsonrpc.js";
import {
  ClientCapabilities,
  Implementation,
  InitializeResponse,
  Method,
  NewSessionRequest,
  NewSessionResponse,
  PROTOCOL_VERSION,
  PromptRequest,
  PromptResponse,
  ReadTextFileRequest,
  ReadTextFileResponse,
  RequestPermissionRequest,
  RequestPermissionResponse,
  SessionNotification,
  WriteTextFileRequest,
} from "./protocol.js";

export interface AcpClientHandlers {
  /** Called for every `session/update` notification the agent streams. */
  onUpdate?: (notification: SessionNotification) => void;
  /**
   * Resolve a permission request. If omitted, the client auto-selects the first
   * `allow_*` option, or cancels if none exists.
   */
  onPermission?: (
    request: RequestPermissionRequest,
  ) => RequestPermissionResponse | Promise<RequestPermissionResponse>;
  /** Provide file contents for `fs/read_text_file`. Presence advertises `fs.readTextFile`. */
  readTextFile?: (request: ReadTextFileRequest) => string | Promise<string>;
  /** Handle `fs/write_text_file`. Presence advertises `fs.writeTextFile`. */
  writeTextFile?: (request: WriteTextFileRequest) => void | Promise<void>;
}

export interface AcpClientOptions {
  clientInfo?: Implementation;
  /** Explicit capabilities; if omitted they are derived from the provided handlers. */
  capabilities?: ClientCapabilities;
  handlers?: AcpClientHandlers;
}

export class AcpClient {
  readonly peer: JsonRpcPeer;
  private readonly handlers: AcpClientHandlers;
  private readonly clientInfo: Implementation;
  private readonly capabilities: ClientCapabilities;

  private negotiatedProtocolVersion: number | null = null;
  private agentInitialize: InitializeResponse | null = null;

  constructor(peer: JsonRpcPeer, options: AcpClientOptions = {}) {
    this.peer = peer;
    this.handlers = options.handlers ?? {};
    this.clientInfo = options.clientInfo ?? { name: "acp-harness", version: "0.1.0" };
    this.capabilities = options.capabilities ?? this.deriveCapabilities();
    this.registerClientMethods();
  }

  /** Capabilities advertised to the agent, reflecting which handlers are present. */
  get clientCapabilities(): ClientCapabilities {
    return this.capabilities;
  }

  get protocolVersion(): number | null {
    return this.negotiatedProtocolVersion;
  }

  get agentInfo(): InitializeResponse | null {
    return this.agentInitialize;
  }

  private deriveCapabilities(): ClientCapabilities {
    return {
      fs: {
        readTextFile: Boolean(this.handlers.readTextFile),
        writeTextFile: Boolean(this.handlers.writeTextFile),
      },
      terminal: false,
    };
  }

  private registerClientMethods(): void {
    this.peer.onNotification(Method.SessionUpdate, (params) => {
      this.handlers.onUpdate?.(params as SessionNotification);
    });

    this.peer.onRequest(Method.RequestPermission, async (params) => {
      const request = params as RequestPermissionRequest;
      if (this.handlers.onPermission) return this.handlers.onPermission(request);
      const allow = request.options.find((o) => o.kind.startsWith("allow"));
      return allow
        ? ({ outcome: { outcome: "selected", optionId: allow.optionId } } satisfies RequestPermissionResponse)
        : ({ outcome: { outcome: "cancelled" } } satisfies RequestPermissionResponse);
    });

    this.peer.onRequest(Method.ReadTextFile, async (params) => {
      if (!this.handlers.readTextFile) {
        throw new RpcError(ErrorCode.MethodNotFound, "fs/read_text_file not supported");
      }
      const content = await this.handlers.readTextFile(params as ReadTextFileRequest);
      return { content } satisfies ReadTextFileResponse;
    });

    this.peer.onRequest(Method.WriteTextFile, async (params) => {
      if (!this.handlers.writeTextFile) {
        throw new RpcError(ErrorCode.MethodNotFound, "fs/write_text_file not supported");
      }
      await this.handlers.writeTextFile(params as WriteTextFileRequest);
      return {};
    });
  }

  /** Perform the ACP `initialize` handshake and record the negotiated version/capabilities. */
  async initialize(): Promise<InitializeResponse> {
    const response = await this.peer.request<InitializeResponse>(Method.Initialize, {
      protocolVersion: PROTOCOL_VERSION,
      clientCapabilities: this.capabilities,
      clientInfo: this.clientInfo,
    });
    this.negotiatedProtocolVersion = response.protocolVersion;
    this.agentInitialize = response;
    return response;
  }

  /** Create a new conversation session. */
  async newSession(params: NewSessionRequest): Promise<NewSessionResponse> {
    return this.peer.request<NewSessionResponse>(Method.NewSession, params);
  }

  /** Send a prompt turn and await its stop reason. Updates stream via `onUpdate`. */
  async prompt(params: PromptRequest): Promise<PromptResponse> {
    return this.peer.request<PromptResponse>(Method.Prompt, params);
  }

  /** Cancel the in-flight prompt turn for a session (fire-and-forget notification). */
  cancel(sessionId: string): void {
    this.peer.notify(Method.Cancel, { sessionId });
  }
}
