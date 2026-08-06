/**
 * A tiny YAML-frontmatter reader for SKILL.md files. It extracts simple `key: value` pairs
 * from the leading `---` block. This is intentionally minimal (no external YAML dependency);
 * SKILL.md frontmatter in the wild uses flat scalar keys such as `name` and `description`.
 */

export interface Frontmatter {
  data: Record<string, string>;
  body: string;
}

export function parseFrontmatter(source: string): Frontmatter {
  const normalized = source.replace(/^\uFEFF/, "");
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(normalized);
  if (!match) return { data: {}, body: normalized };

  const [, rawFront, body] = match;
  const data: Record<string, string> = {};
  for (const line of rawFront.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) data[key] = value;
  }
  return { data, body: body ?? "" };
}
