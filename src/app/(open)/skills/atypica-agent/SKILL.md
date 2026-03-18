---
name: atypica-agent
description: Access atypica.ai's Universal Agent through MCP protocol. The universal agent provides bash tools, skills, discussions, interviews, report generation, and all capabilities from the study agent. Use when users need flexible AI-powered research with full tooling access.
---

# atypica Universal Agent

Access atypica.ai's Universal Agent - a flexible multi-tool agent that combines bash execution, custom skills, persona discussions, interviews, and report generation.

## Prerequisites

**IMPORTANT**: This skill provides two ways to access atypica.ai Universal Agent:

### Option 1: MCP Server (Recommended for AI assistants)

If tools starting with `atypica_universal_` are already available, the MCP server is configured. Otherwise, guide the user to configure it.

**Configuration parameters**:
- **Endpoint**: `https://atypica.ai/mcp/universal`
- **API Key**: From https://atypica.ai/account/api-keys (format: `atypica_xxx`)
- **Authentication**: HTTP header `Authorization: Bearer <api_key>`

**Example: Claude Desktop** - Edit config file at:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "atypica-universal": {
      "transport": "http",
      "url": "https://atypica.ai/mcp/universal",
      "headers": {
        "Authorization": "Bearer atypica_xxx"
      }
    }
  }
}
```

Restart Claude Desktop to load. For other MCP clients, configuration syntax may differ.

### Option 2: Direct Bash Script (Works anywhere)

If MCP server is not available or for simpler use cases, use the bundled bash script:

```bash
scripts/mcp-call.sh <tool_name> <json_args> [options]
```

**Setup**:
```bash
export ATYPICA_TOKEN="atypica_xxx"
```

**Examples**:
```bash
# Create universal chat
scripts/mcp-call.sh atypica_universal_create '{"content":"Research user sentiment"}'

# Get messages with tail parameter (3-5 parts, increase if more context needed)
scripts/mcp-call.sh atypica_universal_get_messages '{"userChatToken":"abc123","tail":5}'
```

**Options**:
- `-t, --token` - API token (overrides ATYPICA_TOKEN)
- `-o, --output` - Output format: text|json|structured|auto
- `-f, --file` - Write output to file instead of stdout
- `-v, --verbose` - Enable verbose output
- `-h, --help` - Show help message

See [scripts/mcp-call.sh](scripts/mcp-call.sh) for full documentation.

## Quick Start

Once the MCP server is installed:

```typescript
// 1. Create universal chat
const result = await callTool("atypica_universal_create", {
  content: "I need to understand user preferences for coffee subscriptions"
});
const userChatToken = result.structuredContent.token;

// 2. Send message (starts the agent run; completion usually takes 10-120s in background)
await callTool("atypica_universal_send_message", {
  userChatToken,
  message: {
    role: "user",
    lastPart: { type: "text", text: "Start research with panel discussion" }
  }
});

// 3. Poll for research progress
let result;
let pollInterval = 30000; // 30 seconds
let tailSize = 5; // Start with 3-5 parts, increase if needed
do {
  await wait(pollInterval);
  result = await callTool("atypica_universal_get_messages", {
    userChatToken,
    tail: tailSize
  });

  // Check for pending confirmations (confirmPanelResearchPlan, requestInteraction)
  const lastMsg = result.structuredContent.messages[result.structuredContent.messages.length - 1];
  if (lastMsg?.role === "assistant") {
    const pendingTool = lastMsg.parts.find(p =>
      p.state === "input-available" && p.type.startsWith("tool-")
    );
    if (pendingTool) {
      // Handle interaction (see User Interactions section)
      break;
    }
  }
} while (result.structuredContent.isRunning);

// 4. Get final report or podcast
const reportTool = result.structuredContent.messages
  .flatMap(m => m.parts)
  .find(p => p.type === "tool-generateReport" && p.output?.reportToken);

if (reportTool?.output?.reportToken) {
  const report = await callTool("atypica_universal_get_report", {
    token: reportTool.output.reportToken
  });
  console.log(report.structuredContent.title);
  console.log(report.structuredContent.shareUrl);
}
```

## Core Workflow

1. **Create** universal chat with initial query
2. **Send** messages to drive research forward (AI executes synchronously)
3. **Poll** for pending interactions that require user input
4. **Handle** interactions by submitting tool results
5. **Monitor** progress and retrieve artifacts (reports/podcasts)

## Available Tools

### Session Management

**atypica_universal_create** - Create universal chat session
- Input: `{ content: string }`
- Returns:
  ```typescript
  {
    token: string;          // Chat session token for subsequent operations
    chatId: number;         // Internal chat ID
    status: "created";      // Always "created" on success
  }
  ```

**atypica_universal_send_message** - Send message and start/continue agent execution
- Two input types:
  - User text: `{ userChatToken, message: { role: "user", lastPart: { type: "text", text } } }`
  - Tool result: See "User Interactions" section
- Returns:
  ```typescript
  {
    messageId: string;           // Message identifier
    role: "user" | "assistant";  // Message role
    status: "running" | "saved_no_ai" | "ai_failed";
    attachmentCount?: number;    // Number of attachments (if any)
    error?: string;              // Error message (if status is "ai_failed")
    reason?: string;             // Reason (if status is "saved_no_ai")
  }
  ```
- Notes:
  - `running` means the message was saved and the agent started/resumed in background
  - Poll `atypica_universal_get_messages` until `isRunning` becomes `false`

**atypica_universal_get_messages** - Retrieve conversation history and execution status
- Input: `{ userChatToken: string, tail?: number }`
- **Works with both universal AND study chats** - can read either kind
- Returns:
  ```typescript
  {
    isRunning: boolean;  // true = AI executing, false = can interact
    messages: Array<{
      messageId: string;
      role: "user" | "assistant";
      parts: Array<MessagePart>;  // Text, tool calls, tool results
      createdAt: string;           // ISO timestamp
    }>;
  }
  ```
- **Critical**:
  - `isRunning: true` → AI is executing, wait and poll again later
  - `isRunning: false` → Can interact, check for pending tool calls in `parts`
  - `tail` (optional): Limit to last N parts across all messages (3-5 recommended)

**atypica_universal_list** - List historical universal chat sessions
- Input:
  ```typescript
  {
    page?: number;      // Default: 1
    pageSize?: number;  // Default: 20, max: 100
  }
  ```
- Returns:
  ```typescript
  {
    data: Array<{
      chatId: number;
      token: string;           // Chat session token
      title: string;           // Auto-generated title
      isRunning: boolean;      // Currently executing
      createdAt: string;       // ISO timestamp
      updatedAt: string;       // ISO timestamp
    }>;
    pagination: {
      page: number;
      pageSize: number;
      totalCount: number;
      totalPages: number;
    };
  }
  ```

### Artifacts

**atypica_universal_get_report** - Get research report
- Input: `{ token: string }`
- Returns:
  ```typescript
  {
    token: string;          // Report token
    instruction: string;    // Generation instruction
    title: string;          // Report title
    description: string;    // Report description
    content: string;        // HTML content (one-page format)
    coverUrl?: string;      // Signed CDN URL for cover image
    shareUrl: string;       // Public share URL: https://atypica.ai/artifacts/report/{token}/share
    generatedAt: string;    // ISO timestamp when generated
    createdAt: string;      // ISO timestamp when created
    updatedAt: string;      // ISO timestamp when last updated
  }
  ```

**atypica_universal_get_podcast** - Get podcast content
- Input: `{ token: string }`
- Returns:
  ```typescript
  {
    token: string;          // Podcast token
    instruction: string;    // Generation instruction
    script: string;         // Full podcast script/transcript
    audioUrl: string;       // Signed CDN URL for audio file
    coverUrl?: string;      // Signed CDN URL for cover image
    metadata: {             // Podcast metadata
      title: string;
      duration?: number;    // Duration in seconds
      coverObjectUrl?: string;
    };
    shareUrl: string;       // Public share URL: https://atypica.ai/artifacts/podcast/{token}/share
    generatedAt: string;    // ISO timestamp when generated
    createdAt: string;      // ISO timestamp when created
    updatedAt: string;      // ISO timestamp when last updated
  }
  ```

### Personas

**atypica_universal_search_personas** - Semantic search for AI personas
- Input:
  ```typescript
  {
    query?: string;        // Text query for name/source matching
    privateOnly?: boolean; // true = only your own private personas
    limit?: number;    // Max results (default: 10, max: 50)
  }
  ```
- With `query`, uses indexed text search
- Without `query`, returns the latest personas visible to you (public + your private, unless `privateOnly` is true)
- Returns:
  ```typescript
  {
    data: Array<{
      personaId: number;
      token: string;       // Persona token
      name: string;        // Persona name
      source: string;      // Persona source/origin
      tier: number;        // Access tier (0-3)
      tags: string[];      // Associated tags
      createdAt: string;   // ISO timestamp
    }>;
  }
  ```

**atypica_universal_get_persona** - Get persona details
- Input: `{ personaId: number }`
- Returns:
  ```typescript
  {
    personaId: number;
    token: string;       // Persona token
    name: string;        // Persona name
    source: string;      // Persona source/origin
    prompt: string;      // Full persona prompt (system prompt for AI)
    tier: number;        // Access tier (0-3)
    tags: string[];      // Associated tags
    locale: string;      // Persona language locale
    createdAt: string;   // ISO timestamp
    updatedAt: string;   // ISO timestamp
  }
  ```

## Understanding Agent State from Messages

**All agent state is in the messages** - you don't need a separate status API. After calling `getMessages`, follow this pattern:

### 1. Check if AI is executing

```typescript
const { isRunning, messages } = result.structuredContent;

if (isRunning) {
  // AI is working in background, cannot interact now
  // Poll again after 30-60 seconds
  return "Agent is running, please wait...";
}
```

### 2. Check for pending interactions

Scan the last assistant message for tool calls needing user input:

```typescript
const lastMsg = messages[messages.length - 1];
if (lastMsg.role === "assistant") {
  for (const part of lastMsg.parts) {
    if (part.type.startsWith("tool-") && part.state === "input-available") {
      // Handle this pending tool call (see User Interactions section)
    }
  }
}
```

### 3. Understand agent progress

Look at recent tool calls to see what's happening:

| Tool Call | Meaning |
|-----------|---------|
| `confirmPanelResearchPlan` | Waiting for research plan confirmation |
| `discussionChat` | Running focus group discussion |
| `interviewChat` | Conducting interviews |
| `scoutTaskChat` | Social media observation |
| `webSearch`, `webFetch` | Gathering information |
| `reasoningThinking` | Deep analysis in progress |
| `searchPersonas`, `buildPersona` | Finding/creating personas |
| `generateReport` | Generating final report |
| `generatePodcast` | Generating podcast |

### 4. Check if research is complete

Look for `generateReport` or `generatePodcast` tool call with output:

```typescript
const reportTool = messages
  .flatMap(m => m.parts)
  .find(p => p.type === "tool-generateReport" && p.state === "output-available");

if (reportTool?.output?.reportToken) {
  // Research complete! Get the report
  const report = await callTool("atypica_universal_get_report", {
    token: reportTool.output.reportToken
  });
  console.log(report.structuredContent.title);
  console.log(report.structuredContent.shareUrl);
}

// Similarly for podcasts
const podcastTool = messages
  .flatMap(m => m.parts)
  .find(p => p.type === "tool-generatePodcast" && p.state === "output-available");

if (podcastTool?.output?.podcastToken) {
  const podcast = await callTool("atypica_universal_get_podcast", {
    token: podcastTool.output.podcastToken
  });
  console.log(podcast.structuredContent.audioUrl);
  console.log(podcast.structuredContent.shareUrl);
}
```

### 5. Continue a stopped agent

**When to use**: If agent stops (`isRunning: false`) but no report/podcast was generated, you can continue it.

**How to continue**:
```typescript
// Check if agent stopped without completing
const { isRunning, messages } = result.structuredContent;
const hasArtifact = messages.some(m =>
  m.parts.some(p =>
    (p.type === "tool-generateReport" || p.type === "tool-generatePodcast") &&
    p.state === "output-available"
  )
);

if (!isRunning && !hasArtifact) {
  // Agent stopped but not complete - you can continue it
  await callTool("atypica_universal_send_message", {
    userChatToken,
    message: {
      role: "user",
      lastPart: {
        type: "text",
        text: "Please continue"
      }
    }
  });

  // Then poll again to check progress
}
```

## User Interactions

The Universal Agent may request user input through interactive tools. Check `getMessages` response for pending calls with `state === "input-available"`.

### confirmPanelResearchPlan - Research Plan Confirmation

**Detect**:
```json
{
  "type": "tool-confirmPanelResearchPlan",
  "state": "input-available",
  "toolCallId": "call_xyz",
  "input": {
    "question": "Original research question",
    "plan": "# Research Plan\n\n## Approach\n...",
    "personas": [
      { "id": 1, "name": "Sarah" },
      { "id": 2, "name": "Mike" }
    ]
  }
}
```

**Submit** via `sendMessage`:
```json
{
  "userChatToken": "...",
  "message": {
    "id": "msg_2",
    "role": "assistant",
    "lastPart": {
      "type": "tool-confirmPanelResearchPlan",
      "toolCallId": "call_xyz",
      "state": "output-available",
      "input": { /* copy from above */ },
      "output": {
        "confirmed": true,
        "editedQuestion": "...",  // Optional: user can edit
        "editedPlan": "...",      // Optional: user can edit
        "plainText": "User confirmed research plan"
      }
    }
  }
}
```

### requestInteraction - User Choice/Input

**Detect**:
```json
{
  "type": "tool-requestInteraction",
  "state": "input-available",
  "toolCallId": "call_abc",
  "input": {
    "question": "Which focus area?",
    "options": ["Product features", "Pricing", "User experience"],
    "maxSelect": 1  // 1=single, 2+=multi with limit, undefined=unlimited
  }
}
```

**Submit** via `sendMessage`:
```json
{
  "userChatToken": "...",
  "message": {
    "id": "msg_2",
    "role": "assistant",
    "lastPart": {
      "type": "tool-requestInteraction",
      "toolCallId": "call_abc",
      "state": "output-available",
      "input": { /* copy from above */ },
      "output": {
        "answer": "Pricing",  // string for single, string[] for multi
        "plainText": "User selected: Pricing"
      }
    }
  }
}
```

## Universal Agent Capabilities

The Universal Agent combines all research capabilities in one flexible interface:

### Research Methods
- **Panel Discussions** (`discussionChat`) - Focus group with 3-8 personas
- **Interviews** (`interviewChat`) - One-on-one deep interviews
- **Social Observation** (`scoutTaskChat`) - Social media insights
- **Web Research** (`webSearch`, `webFetch`) - Information gathering

### Persona Management
- **Search** (`searchPersonas`) - Find existing personas
- **Build** (`buildPersona`) - Create new personas
- **Panel Creation** (`updatePanel`) - Manage persona panels

### Content Generation
- **Reports** (`generateReport`) - Comprehensive research reports
- **Podcasts** (`generatePodcast`) - Audio content with script

### Advanced Features
- **Bash Tools** - Execute shell commands (if configured)
- **Custom Skills** - Run specialized workflows
- **Team Context** - Access team-level memory and prompts
- **MCP Integration** - Use team-configured MCP tools

## Comparison with Study Agent

| Feature | Study Agent | Universal Agent |
|---------|-------------|-----------------|
| **Plan Mode** | ✅ Auto-determines research type | ❌ Open-ended |
| **Research Types** | 7 predefined kinds | Flexible |
| **Personas** | Via searchPersonas tool | Full persona CRUD |
| **Panel Management** | Implicit | Explicit via tools |
| **Bash/Skills** | ❌ Not available | ✅ Available |
| **MCP Tools** | ❌ Not available | ✅ Team MCP access |

**When to use Universal Agent**:
- Need panel management
- Want bash/skill access
- Need team MCP tools
- Prefer flexible workflow over structured research types

**When to use Study Agent**:
- Want Plan Mode for auto-classification
- Prefer structured research types
- Focus on research output (report/podcast)

## Best Practices

1. **Async execution**: `sendMessage` starts or resumes the run, then returns while the agent continues in background
2. **Poll for interactions**: After each `sendMessage`, check `getMessages` for pending tool calls
3. **Error handling**: Check `status` field: `"running" | "saved_no_ai" | "ai_failed"`
4. **Persona search**: Use natural language queries in `search_personas`, or `privateOnly: true` to limit results to your own personas
5. **Tail parameter**: Start with 3-5 for efficiency, increase if more context needed

## Performance Expectations

- Panel research planning: 5-15 seconds
- Focus group discussion: 30-90 seconds
- Interviews (per persona): 20-40 seconds
- Report generation: 30-60 seconds
- Message/persona retrieval: < 2 seconds

## Common Patterns

### Pattern 1: Panel-Based Research

```typescript
// Create chat with panel context
const chat = await callTool("atypica_universal_create", {
  content: "Research coffee preferences with panel discussion"
});

// Agent will:
// 1. Search for relevant personas
// 2. Ask user to confirm selection (requestSelectPersonas)
// 3. Run discussionChat with selected personas
// 4. Generate report
```

### Pattern 2: One-on-One Interviews

```typescript
const chat = await callTool("atypica_universal_create", {
  content: "Interview 5 coffee enthusiasts about their morning routine"
});

// Agent will:
// 1. Search/build personas
// 2. Present research plan (confirmPanelResearchPlan)
// 3. Run interviewChat with each persona
// 4. Generate synthesis report
```

### Pattern 3: Social Observation

```typescript
const chat = await callTool("atypica_universal_create", {
  content: "Observe social media discussions about remote work"
});

// Agent will use scoutTaskChat for qualitative social analysis
```

## Error Handling

**Quota Exceeded**:
```typescript
// sendMessage returns status: "saved_no_ai" with reason: "quota_exceeded"
{
  status: "saved_no_ai",
  reason: "quota_exceeded"
}
// Message saved but AI not executed. Top up tokens at https://atypica.ai/account
```

**Agent Failure**:
```typescript
// sendMessage returns status: "ai_failed" with error message
{
  status: "ai_failed",
  error: "Tool execution failed: ..."
}
// Check error, possibly retry or continue manually
```

## Security & Limitations

- All chats require authentication via API key
- Personas are user-scoped (tier-based access control)
- Reports/podcasts are user-owned
- Rate limits apply (check account dashboard)
- Universal Agent can read both "universal" and "study" kind chats
