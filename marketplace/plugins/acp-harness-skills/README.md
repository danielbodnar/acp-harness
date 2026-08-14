# acp-harness-skills

A Claude Code plugin that bundles the ACP Harness's curated skills **and** wires up the
ACP Harness MCP server (`.mcp.json`).

## Skills

| Skill | Use it when… |
| --- | --- |
| `acp-session-runner` | You want to run or debug an ACP agent through the harness (CLI/TUI or MCP tools). |
| `marketplace-curator` | You are adding, classifying, or validating plugins in a multi-provider marketplace. |
| `mcp-app-builder` | You are adding an interactive ext-apps (MCP Apps) UI to an MCP server. |

## MCP server

Installing this plugin registers an MCP server named `acp-harness` that exposes the
`acp_*`, `marketplace_*`, and `skills_*` tools plus the `open_marketplace_dashboard`
ext-apps View. See `.mcp.json`.

## Install

```text
/plugin marketplace add <path-or-owner/repo-of-this-marketplace>
/plugin install acp-harness-skills@acp-harness-marketplace
```
