# Plugin Marketplace

## Purpose

Provide a Claude Code compatible plugin marketplace that also models multiple provider
types (Claude plugins, GitHub-sourced plugins, and generic ACP agent plugins) so a single
catalog can distribute skills, agents, and MCP servers across the ecosystem.

## Requirements

### Requirement: Claude Code compatible catalog

The marketplace SHALL provide a `.claude-plugin/marketplace.json` catalog that Claude Code
can add and install from, using the documented schema (`name`, `owner`, `plugins`, and
optional `metadata.pluginRoot`).

#### Scenario: Adding the marketplace

- **WHEN** a user runs `/plugin marketplace add` against the repository
- **THEN** the catalog parses and every plugin entry resolves to an existing plugin directory

### Requirement: Multi-provider classification

Each plugin entry SHALL be classifiable as one of three providers: `claude`,
`github`, or `generic-agent`, based on its `source` and an explicit `provider` field.

#### Scenario: Local Claude plugin

- **WHEN** an entry's `source` is a relative path inside the repo
- **THEN** the registry classifies it as a `claude` provider plugin

#### Scenario: GitHub plugin

- **WHEN** an entry's `source` is a `{ "source": "github", "repo": "owner/name" }` object
- **THEN** the registry classifies it as a `github` provider plugin

#### Scenario: Generic ACP agent plugin

- **WHEN** an entry declares `"provider": "generic-agent"` with an agent launch descriptor
- **THEN** the registry classifies it as a `generic-agent` provider plugin and exposes its
  launch command

### Requirement: Bundled skills discovery

The registry SHALL discover Agent Skills bundled inside plugins by locating `SKILL.md`
files and reading their `name` and `description` frontmatter.

#### Scenario: Listing bundled skills

- **WHEN** a plugin contains a `skills/<skill>/SKILL.md`
- **THEN** the registry lists the skill with its `name` and `description`

### Requirement: Known and suggested marketplaces

The project SHALL register a set of known extra marketplaces and document suggested ones,
so downstream tools can discover related catalogs.

#### Scenario: Extra known marketplaces present

- **WHEN** a user inspects `.claude/settings.json`
- **THEN** it contains `extraKnownMarketplaces` entries for known marketplaces
- **AND** the marketplace registry can enumerate known and suggested marketplaces with a
  flag distinguishing the two

### Requirement: Search and inspection

The registry SHALL support listing all plugins, searching by keyword, and returning full
details for a single plugin including its provider and bundled skills.

#### Scenario: Keyword search

- **WHEN** a caller searches for a term appearing in a plugin's name, description, or keywords
- **THEN** the registry returns the matching plugins
