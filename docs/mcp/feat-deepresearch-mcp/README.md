# DeepResearch MCP Server

## Overview

The DeepResearch MCP server provides a single tool (`atypica_deep_research`) that performs deep research using Grok models with web search and X (Twitter) search capabilities. **The tool streams results in real-time** via MCP notifications.

## Architecture

### Stateless Design
- **Server Instance**: Reusable singleton created once and shared across requests
- **Transport**: New `StreamableHTTPServerTransport` created per request
- **Rationale**: Handles high concurrency well, prevents request ID collisions, no session management overhead

### Streaming Architecture

The server implements **real-time streaming** by linking AI SDK's `streamText` output to MCP's StreamableHTTP transport:

```
┌─────────────┐
│   Client    │
│  (MCP CLI)  │
└──────┬──────┘
       │ POST with Accept: text/event-stream
       ▼
┌─────────────────────────────────────┐
│  Next.js API Route                  │
│  /mcp/server/deepresearch              │
│  - Creates StreamableHTTPTransport  │
│  - Returns SSE stream immediately   │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  StreamableHTTPServerTransport      │
│  - Handles JSON-RPC protocol        │
│  - Manages SSE streaming            │
│  - Sends notifications via SSE      │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  MCP Server (deepresearch)          │
│  - Registers tool                   │
│  - Connects to transport            │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Tool Handler                        │
│  - Calls executeDeepResearch()      │
│  - Passes onStreamChunk callback    │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  executeDeepResearch()               │
│  - Calls streamText() with Grok-4   │
│  - Iterates fullStream              │
│  - Invokes callback for each chunk  │
└──────┬──────────────────────────────┘
       │
       ▼ (for each chunk)
┌─────────────────────────────────────┐
│  onStreamChunk callback              │
│  - Sends MCP notification           │
│    notifications/tools/stream       │
│  - Contains chunk type & text       │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Transport.send()                    │
│  - Writes SSE event to stream       │
│  - Format: event: message           │
│            data: {json}              │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  Client receives real-time chunks   │
│  - text-delta: incremental text     │
│  - reasoning-delta: reasoning text  │
│  - source: web/X search sources     │
│  - finish: final usage stats        │
└─────────────────────────────────────┘
```

### File Structure
```
src/
  lib/
    mcp/                    # Shared MCP infrastructure (reusable across all MCP servers)
      index.ts             # Public exports
      types.ts             # Shared types (MCPRequestContext, StreamChunkCallback)
      context.ts           # Request context management (AsyncLocalStorage)
      adapters.ts          # Next.js Request/Response adapters
      streaming.ts         # Streaming notification helpers
      transport.ts         # Transport setup utilities
  app/
    (deepresearch)/
      mcp/
        server/
          deepresearch/
            server.ts      # MCP server setup and tool registration
            tool.ts        # Tool execution logic with streaming
            types.ts       # DeepResearch-specific types and Zod schemas
            README.md      # This file
            STREAMING.md   # Streaming implementation details
            route.ts         # Next.js API route handler with SSE support
```

## Features

- **Real-Time Streaming**: Streams text deltas, reasoning, and sources as they arrive from the LLM
- **Deep Research**: Uses Grok-4 model with web search and X search capabilities
- **Stateless**: No session management, suitable for serverless deployments
- **MCP Protocol Compliant**: Uses StreamableHTTP transport with SSE
- **Error Handling**: Graceful error handling with structured error responses

## Tool: `atypica_deep_research`

### Input Schema
```typescript
{
  query: string  // The deep research query to investigate
}
```

### Output Schema
```typescript
{
  result: string  // The comprehensive research result (final complete text)
}
```

### Streaming Notifications

During execution, the tool sends real-time notifications via `notifications/tools/stream`:

```typescript
// Text delta notification
{
  "jsonrpc": "2.0",
  "method": "notifications/tools/stream",
  "params": {
    "toolName": "atypica_deep_research",
    "chunkType": "text-delta",
    "text": "incremental text chunk..."
  }
}

// Reasoning delta notification
{
  "jsonrpc": "2.0",
  "method": "notifications/tools/stream",
  "params": {
    "toolName": "atypica_deep_research",
    "chunkType": "reasoning-delta",
    "text": "reasoning text..."
  }
}

// Source notification (from web/X search)
{
  "jsonrpc": "2.0",
  "method": "notifications/tools/stream",
  "params": {
    "toolName": "atypica_deep_research",
    "chunkType": "source",
    "source": {
      "id": "source-1",
      "url": "https://example.com",
      "title": "Source Title"
    }
  }
}

// Finish notification with usage stats
{
  "jsonrpc": "2.0",
  "method": "notifications/tools/stream",
  "params": {
    "toolName": "atypica_deep_research",
    "chunkType": "finish",
    "usage": {
      "inputTokens": 100,
      "outputTokens": 500,
      "totalTokens": 600
    }
  }
}
```

### Usage Example

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "atypica_deep_research",
    "arguments": {
      "query": "What are the latest developments in quantum computing?"
    }
  },
  "id": 1
}
```

**Response Flow:**
1. Client sends POST with `Accept: text/event-stream, application/json`
2. Server immediately returns SSE stream (Content-Type: text/event-stream)
3. Tool execution begins, streaming notifications arrive in real-time
4. Final JSON-RPC response arrives with complete result
5. SSE stream closes

## Implementation Details

### Streaming Mechanism

The implementation uses a **callback-based approach** to link AI SDK streaming to MCP transport:

1. **AI SDK `streamText`**: Provides `fullStream` AsyncIterable with typed chunks
2. **Callback Function**: `onStreamChunk` passed to `executeDeepResearch()`
3. **MCP Notifications**: Callback sends `notifications/tools/stream` via transport
4. **SSE Transport**: StreamableHTTPServerTransport writes to SSE stream
5. **Final Result**: Complete text returned as tool result

**Key Design Decision:** We chose the callback approach over:
- Generator-based streaming (requires MCP SDK support)
- Direct transport access (breaks abstraction)
- Progress notifications only (limited to progress, not full content)

### Model Selection
- Primary: `grok-4-1-fast-non-reasoning`
- Fallback: Handled automatically by the provider
- Tools: XAI's built-in `web_search` and `x_search`

### XAI Tools Configuration
```typescript
{
  web_search: xai.tools.webSearch({
    enableImageUnderstanding: true,
  }),
  x_search: xai.tools.xSearch({
    enableImageUnderstanding: true,
    enableVideoUnderstanding: true,
  }),
}
```

## Testing

### Using MCP Inspector (Recommended)

```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Start your Next.js server
pnpm dev

# Connect inspector to your MCP server
mcp-inspector http://localhost:3000/mcp/server/deepresearch
```

### Using curl with SSE

```bash
# Send request and watch SSE stream
curl -X POST http://localhost:3000/mcp/server/deepresearch \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream, application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "atypica_deep_research",
      "arguments": {
        "query": "What is quantum computing?"
      }
    },
    "id": 1
  }'
```

### Expected Output

```
event: message
data: {"jsonrpc":"2.0","method":"notifications/tools/stream","params":{"toolName":"atypica_deep_research","chunkType":"text-delta","text":"Quantum"}}

event: message
data: {"jsonrpc":"2.0","method":"notifications/tools/stream","params":{"toolName":"atypica_deep_research","chunkType":"text-delta","text":" computing"}}

...

event: message
data: {"jsonrpc":"2.0","method":"notifications/tools/stream","params":{"toolName":"atypica_deep_research","chunkType":"source","source":{"id":"src-1","url":"https://...","title":"..."}}}

...

event: message
data: {"jsonrpc":"2.0","method":"notifications/tools/stream","params":{"toolName":"atypica_deep_research","chunkType":"finish","usage":{"inputTokens":100,"outputTokens":500,"totalTokens":600}}}

event: message
data: {"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"Quantum computing is..."}]}}
```

## Future Enhancements

1. **Progress Tracking**: Add percentage completion estimates
2. **Session Management**: Optional stateful mode for multi-turn interactions
3. **Caching**: Result caching for repeated queries
4. **Rate Limiting**: Production-ready rate limiting
5. **Metrics**: Token usage tracking and cost estimation
6. **Resumability**: Support for reconnection and stream resumption
7. **Authentication**: Add API key or JWT-based auth
8. **Multiple Models**: Support for model selection via parameters
