/** Incremental renderer for ACP `session/update` notifications, with light ANSI styling. */

import type { SessionNotification, SessionUpdate } from "@acp/acp-client";

const supportsColor = process.stdout.isTTY && process.env.NO_COLOR === undefined;

const style = {
  dim: (s: string) => (supportsColor ? `\x1b[2m${s}\x1b[0m` : s),
  bold: (s: string) => (supportsColor ? `\x1b[1m${s}\x1b[0m` : s),
  cyan: (s: string) => (supportsColor ? `\x1b[36m${s}\x1b[0m` : s),
  green: (s: string) => (supportsColor ? `\x1b[32m${s}\x1b[0m` : s),
  yellow: (s: string) => (supportsColor ? `\x1b[33m${s}\x1b[0m` : s),
  magenta: (s: string) => (supportsColor ? `\x1b[35m${s}\x1b[0m` : s),
};

function textOf(content: unknown): string {
  if (content && typeof content === "object" && "text" in (content as Record<string, unknown>)) {
    return String((content as { text?: unknown }).text ?? "");
  }
  return "";
}

export class UpdateRenderer {
  private streaming = false;
  private out: NodeJS.WritableStream;

  constructor(out: NodeJS.WritableStream = process.stdout) {
    this.out = out;
  }

  handle(notification: SessionNotification): void {
    this.render(notification.update);
  }

  /** Close any in-progress streamed line. */
  finishStream(): void {
    if (this.streaming) {
      this.out.write("\n");
      this.streaming = false;
    }
  }

  private write(line: string): void {
    this.finishStream();
    this.out.write(line + "\n");
  }

  private render(update: SessionUpdate): void {
    switch (update.sessionUpdate) {
      case "agent_message_chunk": {
        if (!this.streaming) {
          this.out.write(style.green("agent ") + style.dim("│ "));
          this.streaming = true;
        }
        this.out.write(textOf((update as { content?: unknown }).content));
        break;
      }
      case "agent_thought_chunk": {
        this.write(style.magenta("think ") + style.dim("│ ") + style.dim(textOf((update as { content?: unknown }).content)));
        break;
      }
      case "user_message_chunk": {
        this.write(style.cyan("user  ") + style.dim("│ ") + textOf((update as { content?: unknown }).content));
        break;
      }
      case "tool_call": {
        const u = update as { toolCallId: string; title?: string; kind?: string; status?: string };
        this.write(
          style.yellow("tool  ") +
            style.dim("│ ") +
            style.bold(u.title ?? u.toolCallId) +
            style.dim(` [${u.kind ?? "tool"}] ${u.status ?? "pending"}`),
        );
        break;
      }
      case "tool_call_update": {
        const u = update as { toolCallId: string; status?: string };
        this.write(style.yellow("tool  ") + style.dim("│ ") + style.dim(`${u.toolCallId} → ${u.status ?? "updated"}`));
        break;
      }
      case "plan": {
        const entries = ((update as { entries?: unknown[] }).entries ?? []) as Array<{
          content?: string;
          status?: string;
        }>;
        this.write(style.cyan("plan  ") + style.dim("│"));
        for (const entry of entries) {
          const mark = entry.status === "completed" ? "✔" : entry.status === "in_progress" ? "▶" : "•";
          this.write(style.dim("      │ ") + `${mark} ${entry.content ?? ""}`);
        }
        break;
      }
      default: {
        this.write(style.dim(`      │ (${update.sessionUpdate})`));
      }
    }
  }
}
