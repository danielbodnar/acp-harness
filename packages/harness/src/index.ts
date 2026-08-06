/**
 * acp-harness CLI entry point.
 *
 * Commands:
 *   agents                          List configured ACP agents
 *   run <agentId> <prompt...>       One-shot prompt against an agent
 *   tui [agentId]                   Interactive session
 *   plugins [list|skills|marketplaces|search <term>]
 *
 * Global options: --cwd <dir>, --config <file>, --yes (auto-allow permissions), --help
 */

import { runAgents } from "./commands/agents.js";
import { runPlugins } from "./commands/plugins.js";
import { runOnce } from "./commands/run.js";
import { runTui } from "./commands/tui.js";

interface ParsedArgs {
  positionals: string[];
  options: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const options: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        options[key] = next;
        i++;
      } else {
        options[key] = true;
      }
    } else {
      positionals.push(arg);
    }
  }
  return { positionals, options };
}

const HELP = `acp-harness — vendor-agnostic ACP CLI/TUI

Usage:
  acp-harness agents                              List configured ACP agents
  acp-harness run <agentId> <prompt...>           One-shot prompt against an agent
  acp-harness tui [agentId]                       Interactive session
  acp-harness plugins [list|skills|marketplaces|search <term>]

Options:
  --cwd <dir>        Working directory for the agent session (default: process cwd)
  --config <file>    Path to agents.json (default: <repo>/config/agents.json)
  --yes              Auto-allow permission requests in one-shot runs
  --help             Show this help
`;

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const { positionals, options } = parseArgs(argv);
  const command = positionals[0];

  if (!command || options.help) {
    console.log(HELP);
    return command ? 0 : options.help ? 0 : 1;
  }

  const cwd = typeof options.cwd === "string" ? options.cwd : process.cwd();
  const configFile = typeof options.config === "string" ? options.config : undefined;

  try {
    switch (command) {
      case "agents":
        return runAgents({ configFile });
      case "run": {
        const agentId = positionals[1];
        const prompt = positionals.slice(2).join(" ");
        if (!agentId || !prompt) {
          console.error("Usage: acp-harness run <agentId> <prompt...>");
          return 1;
        }
        return await runOnce({ agentId, prompt, cwd, configFile, autoAllow: options.yes !== false });
      }
      case "tui":
        return await runTui({ agentId: positionals[1], cwd, configFile });
      case "plugins":
        return runPlugins(positionals.slice(1), options);
      default:
        console.error(`Unknown command: ${command}\n`);
        console.log(HELP);
        return 1;
    }
  } catch (err) {
    console.error(`error: ${(err as Error).message}`);
    return 1;
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
