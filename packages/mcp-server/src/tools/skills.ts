/** MCP tools that expose the curated Agent Skills bundled in marketplace plugins. */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { ServerContext } from "../context.js";
import { jsonResult } from "./helpers.js";

export function registerSkillsTools(server: McpServer, ctx: ServerContext): void {
  server.registerTool(
    "skills_list",
    {
      title: "List bundled skills",
      description: "List every Agent Skill bundled in the marketplace's plugins, with its owning plugin.",
    },
    async () => {
      const skills = ctx.registry.listSkills().map((s) => ({
        name: s.name,
        description: s.description,
        plugin: s.plugin,
      }));
      return jsonResult({ count: skills.length, skills });
    },
  );

  server.registerTool(
    "skills_get",
    {
      title: "Get a skill",
      description: "Return a skill's YAML frontmatter fields and its full Markdown body by skill name.",
      inputSchema: { name: z.string().describe("Skill name (matches its folder / frontmatter name).") },
    },
    async ({ name }) => {
      const found = ctx.registry.getSkill(name);
      if (!found) {
        return jsonResult(
          { error: `Unknown skill: ${name}`, available: ctx.registry.listSkills().map((s) => s.name) },
          { isError: true },
        );
      }
      return jsonResult({
        name: found.skill.name,
        plugin: found.skill.plugin,
        path: found.skill.path,
        frontmatter: found.data,
        body: found.body,
      });
    },
  );
}
