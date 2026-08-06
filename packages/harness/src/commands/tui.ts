/** `acp-harness tui [agentId]` — a minimal interactive ACP session (readline-based). */

import { createInterface } from "node:readline";

import { textBlock, type RequestPermissionRequest, type RequestPermissionResponse } from "@acp/acp-client";

import { findAgent, loadAgents } from "../config.js";
import { UpdateRenderer } from "../render.js";
import { connect, type Connection } from "../session.js";

export interface TuiOptions {
  agentId?: string;
  cwd: string;
  configFile?: string;
}

export async function runTui(opts: TuiOptions): Promise<number> {
  const { agents } = loadAgents({ configFile: opts.configFile });
  const agent = opts.agentId ? findAgent(agents, opts.agentId) : agents[0];
  if (!agent) {
    console.error(
      opts.agentId ? `Unknown agent: ${opts.agentId}` : "No agents configured. See `acp-harness agents`.",
    );
    return 1;
  }

  const renderer = new UpdateRenderer();
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: "» " });

  const onPermission = (req: RequestPermissionRequest): Promise<RequestPermissionResponse> =>
    new Promise((resolve) => {
      renderer.finishStream();
      const list = req.options.map((o, i) => `  [${i + 1}] ${o.name} (${o.kind})`).join("\n");
      console.log(`\nPermission requested for: ${req.toolCall.title ?? req.toolCall.toolCallId}\n${list}`);
      rl.question("Choose option number (or Enter to cancel): ", (answer) => {
        const idx = Number.parseInt(answer.trim(), 10);
        const option = req.options[idx - 1];
        resolve(
          option
            ? { outcome: { outcome: "selected", optionId: option.optionId } }
            : { outcome: { outcome: "cancelled" } },
        );
      });
    });

  let connection: Connection;
  try {
    connection = await connect(agent, { cwd: opts.cwd, renderer, onPermission });
  } catch (err) {
    console.error(`Failed to connect to ${agent.id}: ${(err as Error).message}`);
    rl.close();
    return 1;
  }

  const client = connection.agent.client;
  const sessionId = connection.session.sessionId;
  console.log(
    `Connected to ${agent.name} (ACP v${client.protocolVersion}). ` +
      `Type a message, /help for commands, /exit to quit.\n`,
  );

  let busy = false;
  rl.prompt();

  rl.on("line", (raw) => {
    const line = raw.trim();
    if (busy) return; // ignore input while a turn is running
    if (line.length === 0) return rl.prompt();

    if (line.startsWith("/")) {
      switch (line) {
        case "/exit":
        case "/quit":
          rl.close();
          return;
        case "/help":
          console.log("Commands: /help, /exit. Anything else is sent as a prompt.");
          return rl.prompt();
        default:
          console.log(`Unknown command: ${line}`);
          return rl.prompt();
      }
    }

    busy = true;
    client
      .prompt({ sessionId, prompt: [textBlock(line)] })
      .then((result) => {
        renderer.finishStream();
        console.log(`\n■ ${result.stopReason}\n`);
      })
      .catch((err: unknown) => {
        renderer.finishStream();
        console.error(`\nerror: ${(err as Error).message}\n`);
      })
      .finally(() => {
        busy = false;
        rl.prompt();
      });
  });

  // Ctrl-C cancels an in-flight turn, or exits when idle.
  rl.on("SIGINT", () => {
    if (busy) {
      client.cancel(sessionId);
      console.log("\n(cancelling…)");
    } else {
      rl.close();
    }
  });

  return new Promise<number>((resolve) => {
    rl.on("close", () => {
      connection.dispose();
      console.log("\nGoodbye.");
      resolve(0);
    });
  });
}
