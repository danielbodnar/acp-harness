/**
 * A minimal, transport-agnostic JSON-RPC 2.0 peer.
 *
 * ACP frames JSON-RPC messages as newline-delimited JSON (ndjson) over stdio: each message
 * is a single JSON object on its own line. This peer handles request/response correlation,
 * notifications, and bidirectional method dispatch. It does not know about streams — the
 * caller supplies a `write` function and feeds inbound lines via {@link JsonRpcPeer.handleLine}.
 */

export type JsonRpcId = number | string;

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcRequestMessage {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params?: unknown;
}

export interface JsonRpcNotificationMessage {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

export interface JsonRpcResponseMessage {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: JsonRpcError;
}

export type JsonRpcMessage =
  | JsonRpcRequestMessage
  | JsonRpcNotificationMessage
  | JsonRpcResponseMessage;

/** Standard JSON-RPC error codes plus ACP's cancellation code. */
export const ErrorCode = {
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
  /** ACP: request was cancelled (see `$/cancel_request`). */
  Cancelled: -32800,
} as const;

/** An error that carries a JSON-RPC error code, for use inside request handlers. */
export class RpcError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = "RpcError";
  }
}

export type RequestHandler = (params: unknown) => unknown | Promise<unknown>;
export type NotificationHandler = (params: unknown) => void | Promise<void>;

interface Pending {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

export interface JsonRpcPeerOptions {
  /** Called for any protocol-level problem (bad JSON, unexpected message). Defaults to console.error. */
  onError?: (message: string, detail?: unknown) => void;
}

export class JsonRpcPeer {
  private nextId = 1;
  private readonly pending = new Map<JsonRpcId, Pending>();
  private readonly requestHandlers = new Map<string, RequestHandler>();
  private readonly notificationHandlers = new Map<string, NotificationHandler>();
  private readonly onError: (message: string, detail?: unknown) => void;

  constructor(
    private readonly write: (line: string) => void,
    options: JsonRpcPeerOptions = {},
  ) {
    this.onError = options.onError ?? ((m, d) => console.error(`[jsonrpc] ${m}`, d ?? ""));
  }

  /** Register a handler for an inbound request (a message with both `method` and `id`). */
  onRequest(method: string, handler: RequestHandler): void {
    this.requestHandlers.set(method, handler);
  }

  /** Register a handler for an inbound notification (a `method` message without `id`). */
  onNotification(method: string, handler: NotificationHandler): void {
    this.notificationHandlers.set(method, handler);
  }

  /** Send a request and resolve with the result (or reject with an {@link RpcError}). */
  request<T = unknown>(method: string, params?: unknown): Promise<T> {
    const id = this.nextId++;
    const message: JsonRpcRequestMessage = { jsonrpc: "2.0", id, method };
    if (params !== undefined) message.params = params;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.send(message);
    });
  }

  /** Send a fire-and-forget notification. */
  notify(method: string, params?: unknown): void {
    const message: JsonRpcNotificationMessage = { jsonrpc: "2.0", method };
    if (params !== undefined) message.params = params;
    this.send(message);
  }

  /** Feed a single inbound ndjson line into the peer. Blank lines are ignored. */
  handleLine(line: string): void {
    const trimmed = line.trim();
    if (trimmed.length === 0) return;
    let message: JsonRpcMessage;
    try {
      message = JSON.parse(trimmed) as JsonRpcMessage;
    } catch {
      // Per spec robustness: tolerate non-JSON lines (e.g. stray agent logging) and continue.
      this.onError("dropping non-JSON line", trimmed.slice(0, 200));
      return;
    }
    void this.dispatch(message);
  }

  /** Reject all pending requests, e.g. when the underlying transport closes. */
  rejectAllPending(reason: unknown): void {
    for (const [, pending] of this.pending) pending.reject(reason);
    this.pending.clear();
  }

  private async dispatch(message: JsonRpcMessage): Promise<void> {
    if ("id" in message && ("result" in message || "error" in message)) {
      this.handleResponse(message as JsonRpcResponseMessage);
      return;
    }
    if ("method" in message && "id" in message) {
      await this.handleRequest(message as JsonRpcRequestMessage);
      return;
    }
    if ("method" in message) {
      await this.handleNotification(message as JsonRpcNotificationMessage);
      return;
    }
    this.onError("unrecognized JSON-RPC message", message);
  }

  private handleResponse(message: JsonRpcResponseMessage): void {
    const pending = this.pending.get(message.id);
    if (!pending) {
      this.onError("response for unknown id", message.id);
      return;
    }
    this.pending.delete(message.id);
    if (message.error) {
      pending.reject(new RpcError(message.error.code, message.error.message, message.error.data));
    } else {
      pending.resolve(message.result);
    }
  }

  private async handleRequest(message: JsonRpcRequestMessage): Promise<void> {
    const handler = this.requestHandlers.get(message.method);
    if (!handler) {
      this.send({
        jsonrpc: "2.0",
        id: message.id,
        error: { code: ErrorCode.MethodNotFound, message: `Method not found: ${message.method}` },
      });
      return;
    }
    try {
      const result = await handler(message.params);
      this.send({ jsonrpc: "2.0", id: message.id, result: result ?? null });
    } catch (err) {
      const error =
        err instanceof RpcError
          ? { code: err.code, message: err.message, data: err.data }
          : { code: ErrorCode.InternalError, message: (err as Error)?.message ?? "Internal error" };
      this.send({ jsonrpc: "2.0", id: message.id, error });
    }
  }

  private async handleNotification(message: JsonRpcNotificationMessage): Promise<void> {
    const handler = this.notificationHandlers.get(message.method);
    if (!handler) return; // Notifications without handlers are silently ignored per spec.
    try {
      await handler(message.params);
    } catch (err) {
      this.onError(`notification handler for ${message.method} threw`, err);
    }
  }

  private send(message: JsonRpcMessage): void {
    this.write(JSON.stringify(message) + "\n");
  }
}

/**
 * Split a byte/character stream into complete ndjson lines, invoking `onLine` for each.
 * Returns a `push` function to feed chunks and buffers partial trailing lines.
 */
export function createLineSplitter(onLine: (line: string) => void): (chunk: string) => void {
  let buffer = "";
  return (chunk: string) => {
    buffer += chunk;
    let index: number;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      onLine(line);
    }
  };
}
