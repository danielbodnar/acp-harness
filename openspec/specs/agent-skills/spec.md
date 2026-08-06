# Agent Skills

## Purpose
Ship a curated set of specialized skills in the portable Agent Skills `SKILL.md` format so
they work across ACP-compliant agents, and bundle them inside marketplace plugins for
distribution.

## Requirements

### Requirement: Portable SKILL.md format
Every bundled skill SHALL be a directory containing a `SKILL.md` whose YAML frontmatter has
at least `name` and `description`, where `name` matches the directory name.

#### Scenario: Valid skill
- **WHEN** the skills validator reads a skill directory
- **THEN** it confirms a `SKILL.md` exists with `name` equal to the folder name and a
  non-empty `description`

### Requirement: Curated skill set
The project SHALL provide at least three specialized skills covering: running ACP agents,
curating the marketplace, and building MCP Apps (ext-apps) UIs.

#### Scenario: Curated skills present
- **WHEN** a caller lists the bundled skills
- **THEN** it finds `acp-session-runner`, `marketplace-curator`, and `mcp-app-builder`

### Requirement: Skills bundled as plugins
Skills SHALL be distributed by being bundled inside a marketplace plugin, discoverable
through the marketplace registry.

#### Scenario: Skill reachable via marketplace
- **WHEN** the marketplace registry resolves the skills plugin
- **THEN** each curated skill is returned with its owning plugin and filesystem path
