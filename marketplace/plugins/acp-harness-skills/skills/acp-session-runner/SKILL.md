---
name: acp-session-runner
description: Run and debug ACP (Agent Client Protocol) coding agents through the ACP Harness. Use when the user wants to start an agent session, send a prompt to an ACP agent, switch between agents like Gemini/Claude Code/Codex, or troubleshoot the initialize/session handshake.
---

# ACP Session Runner

Drive any ACP-compliant coding agent through the harness. ACP is JSON-RPC 2.0 between an
editor (client) and an agent, framed as newline-delimited JSON over the agent's stdio.

## Pick an agent

List configured agents (from `config/agents.json`):

```bash
acp-harness agents
```

The bundled `mock` agent works offline and is ideal for smoke tests.

## One-shot prompt

```bash
acp-harness run mock "Summarize what ACP is in one sentence."
```

The harness performs `initialize` → `session/new` → `session/prompt`, streams
`session/update` notifications (message chunks, thoughts, tool calls, plans), and prints the
final `stopReason`.

## Interactive session

```bash
acp-harness tui gemini
```

Type messages; `Ctrl-C` cancels an in-flight turn (`session/cancel`); `/exit` quits.

## Via MCP

If you are inside an MCP host, the same capability is available as tools:

- `acp_list_agents` — enumerate configured agents.
- `acp_run_prompt` — `{ agentId, prompt, cwd? }` → aggregated text, tool calls, stop reason.

## Troubleshooting

- **Nothing streams back:** confirm the agent actually speaks ACP over stdio and emits one
  JSON object per line. Stray non-JSON log lines are tolerated (ignored) by the harness.
- **`initialize` fails:** check the negotiated `protocolVersion`; the harness targets v1.
- **Permission prompts hang in scripts:** pass `--yes` to auto-allow, or handle
  `session/request_permission` explicitly.
- **`fs/*` method-not-found:** the harness only answers filesystem requests when it
  advertised `fs.readTextFile` / `fs.writeTextFile` capabilities.
