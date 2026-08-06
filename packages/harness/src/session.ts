/** Helper to connect to an agent: spawn, initialize, and open a session. */

import { readFile, writeFile } from "node:fs/promises";

import {
  type NewSessionResponse,
  type ReadTextFileRequest,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  spawnAgent,
  type SpawnedAgent,
  type WriteTextFileRequest,
} from "@acp/acp-client";

import type { AgentConfig } from "./config.js";
import { UpdateRenderer } from "./render.js";

export interface ConnectOptions {
  cwd: string;
  renderer: UpdateRenderer;
  /** Auto-answer permission prompts (non-interactive). */
  autoAllow?: boolean;
  /** Provide a custom permission resolver (interactive TUI). */
  onPermission?: (req: RequestPermissionRequest) => Promise<RequestPermissionResponse>;
  /** Enable filesystem capabilities (read/write) backed by the local disk. */
  enableFs?: boolean;
}

export interface Connection {
  agent: SpawnedAgent;
  session: NewSessionResponse;
  dispose: () => void;
}

export async function connect(agentConfig: AgentConfig, options: ConnectOptions): Promise<Connection> {
  const enableFs = options.enableFs ?? true;

  const agent = spawnAgent(
    { command: agentConfig.command, args: agentConfig.args, env: agentConfig.env, cwd: agentConfig.cwd ?? options.cwd },
    {
      clientInfo: { name: "acp-harness", version: "0.1.0" },
      handlers: {
        onUpdate: (n) => options.renderer.handle(n),
        onPermission: options.onPermission ?? (options.autoAllow ? autoAllow : undefined),
        readTextFile: enableFs ? readTextFileFromDisk : undefined,
        writeTextFile: enableFs ? writeTextFileToDisk : undefined,
      },
    },
  );

  await agent.client.initialize();
  const session = await agent.client.newSession({ cwd: options.cwd, mcpServers: [] });

  return { agent, session, dispose: agent.dispose };
}

function autoAllow(req: RequestPermissionRequest): RequestPermissionResponse {
  const allow = req.options.find((o) => o.kind.startsWith("allow"));
  return allow
    ? { outcome: { outcome: "selected", optionId: allow.optionId } }
    : { outcome: { outcome: "cancelled" } };
}

async function readTextFileFromDisk(req: ReadTextFileRequest): Promise<string> {
  const content = await readFile(req.path, "utf8");
  if (req.line == null && req.limit == null) return content;
  const lines = content.split("\n");
  const start = Math.max(0, (req.line ?? 1) - 1);
  const end = req.limit == null ? lines.length : start + req.limit;
  return lines.slice(start, end).join("\n");
}

async function writeTextFileToDisk(req: WriteTextFileRequest): Promise<void> {
  await writeFile(req.path, req.content, "utf8");
}
