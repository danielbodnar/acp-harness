## ADDED Requirements

### Requirement: Modern MCP server with negotiation

The server SHALL be built on the official MCP SDK, advertise server info and capabilities,
and negotiate the protocol version with the connecting host.

#### Scenario: Initialize

- **WHEN** an MCP host connects and initializes
- **THEN** the server responds with its name, version, and capabilities and completes the
  handshake

### Requirement: Dual transports

The server SHALL support stdio transport and a Streamable HTTP transport, selectable at
launch.

#### Scenario: Stdio launch

- **WHEN** the server is launched with the stdio transport (default)
- **THEN** it serves MCP over the process's stdin/stdout

#### Scenario: HTTP launch

- **WHEN** the server is launched with `--http [port]`
- **THEN** it serves MCP over a Streamable HTTP endpoint at `/mcp`

### Requirement: ACP control tools

The server SHALL expose tools to list configured ACP agents and to run a prompt against a
selected agent, returning the aggregated output and stop reason.

#### Scenario: Run a prompt via MCP

- **WHEN** a host calls the run-prompt tool with an agent id and prompt
- **THEN** the server drives that ACP agent and returns the agent's text output and stop reason

### Requirement: Marketplace tools

The server SHALL expose tools to list and search marketplace plugins, inspect a plugin,
list bundled skills, and enumerate known/suggested marketplaces.

#### Scenario: Browse marketplace via MCP

- **WHEN** a host calls the list-plugins tool
- **THEN** the server returns each plugin with its provider classification and skills

### Requirement: Skills tools

The server SHALL expose tools to list bundled skills and to fetch a skill's full `SKILL.md`
content.

#### Scenario: Fetch a skill body

- **WHEN** a host calls the get-skill tool with a skill name
- **THEN** the server returns that skill's frontmatter and markdown body

### Requirement: ext-apps interactive UI

The server SHALL register an MCP Apps (`io.modelcontextprotocol/ui`) UI resource under the
`ui://` scheme with MIME type `text/html;profile=mcp-app`, and at least one tool linked to
it via `_meta.ui.resourceUri`, so capable hosts can render an interactive dashboard.

#### Scenario: Dashboard resource is registered

- **WHEN** a host lists resources
- **THEN** it finds `ui://acp-harness/dashboard.html` with MIME type `text/html;profile=mcp-app`

#### Scenario: Tool links to the UI resource

- **WHEN** a host inspects the dashboard tool's metadata
- **THEN** `_meta.ui.resourceUri` equals the dashboard resource URI
- **AND** calling the tool returns structured marketplace data the UI can render
