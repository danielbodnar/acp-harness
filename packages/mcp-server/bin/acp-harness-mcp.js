#!/usr/bin/env node
import { main } from "../dist/index.js";
main().catch((err) => {
  process.stderr.write(`[acp-harness-mcp] fatal: ${err?.message ?? err}\n`);
  process.exit(1);
});
