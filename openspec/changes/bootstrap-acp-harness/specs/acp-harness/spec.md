## ADDED Requirements

### Requirement: Vendor-agnostic ACP transport
The harness SHALL communicate with agents using JSON-RPC 2.0 framed as newline-delimited
JSON (ndjson) over the agent subprocess's stdio, without depending on any single vendor's
agent SDK.

#### Scenario: Speaking to an arbitrary agent
- **WHEN** the harness is configured with a command that launches an ACP-compliant agent
- **THEN** it exchanges JSON-RPC messages over the process's stdin/stdout
- **AND** it does not require agent-specific code paths to complete a prompt turn

#### Scenario: Malformed line is tolerated
- **WHEN** the agent emits a line that is not valid JSON
- **THEN** the harness ignores that line and continues processing subsequent messages

### Requirement: Capability negotiation
The harness SHALL send an `initialize` request advertising its client capabilities and
SHALL record the agent's negotiated protocol version and capabilities before creating a
session.

#### Scenario: Initialize handshake
- **WHEN** a connection to an agent is established
- **THEN** the harness sends `initialize` with its `protocolVersion` and `clientCapabilities`
- **AND** stores the `protocolVersion` and `agentCapabilities` returned by the agent

### Requirement: Session lifecycle
The harness SHALL create sessions with `session/new` and drive them with `session/prompt`,
and SHALL support cancelling an in-flight turn with `session/cancel`.

#### Scenario: One-shot prompt
- **WHEN** the user runs the harness with an agent id and a prompt string
- **THEN** the harness creates a session and sends the prompt as a text content block
- **AND** prints the agent's streamed output and the final stop reason

#### Scenario: Cancellation
- **WHEN** the user interrupts an in-flight turn
- **THEN** the harness sends a `session/cancel` notification for the active session

### Requirement: Client-side method handling
The harness SHALL respond to agent-initiated requests for filesystem access and permission
according to the capabilities it advertised.

#### Scenario: Permission prompt
- **WHEN** the agent sends `session/request_permission`
- **THEN** the harness resolves an outcome (interactively in the TUI, or via a configured
  default in non-interactive mode) and returns it to the agent

#### Scenario: Filesystem read honoring capability
- **WHEN** the agent calls `fs/read_text_file` and the harness advertised `fs.readTextFile`
- **THEN** the harness returns the file contents; otherwise it returns a method-not-found error

### Requirement: Agent registry
The harness SHALL load a registry of available agents from `config/agents.json` and expose
a command to list them.

#### Scenario: Listing agents
- **WHEN** the user asks the harness to list agents
- **THEN** it prints each configured agent's id, description, and launch command

### Requirement: Streaming render
The harness SHALL render `session/update` notifications incrementally, distinguishing
message chunks, agent thoughts, tool calls, and plan updates.

#### Scenario: Rendering a tool call
- **WHEN** the agent streams a `tool_call` update followed by a `tool_call_update`
- **THEN** the harness shows the tool name and reflects its status transition
