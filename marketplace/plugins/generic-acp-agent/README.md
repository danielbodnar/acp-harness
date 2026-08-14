# generic-acp-agent

A provider-agnostic **ACP agent** template. ACP is vendor-neutral: any agent that speaks the
protocol over stdio can be driven by the harness and any ACP-compatible editor.

## Use it

1. Copy this plugin directory to a new name.
2. Edit `agent.json` — set `command`/`args`/`env` to launch your ACP agent
   (e.g. `gemini --experimental-acp`, `codex-acp`, or your in-house agent).
3. Register the agent in the repo's `config/agents.json` so `acp-harness` can run it:

   ```json
   { "id": "my-agent", "name": "My Agent", "command": "my-acp-agent", "args": ["--acp"] }
   ```

4. Run it:

   ```bash
   acp-harness run my-agent "hello"
   ```

This plugin is classified by the marketplace registry as the `generic-agent` provider.
