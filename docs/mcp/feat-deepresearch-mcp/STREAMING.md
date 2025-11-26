# Streaming Implementation Guide

## Overview

This document explains how we link AI SDK's `streamText` output to MCP's StreamableHTTP transport for real-time streaming.

## Three Approaches Considered

### Approach 1: Callback-Based with MCP Notifications ⭐ **IMPLEMENTED**

**Concept**: Use a callback function to send MCP notifications for each chunk.

```typescript
async function executeDeepResearch({ query, onStreamChunk }) {
  const response = streamText({ model, messages: [...] });
  
  for await (const chunk of response.fullStream) {
    if (chunk.type === "text-delta") {
      await onStreamChunk({ type: "text-delta", text: chunk.text });
    }
  }
  
  return { result: await response.text };
}

// In tool handler
server.registerTool("atypica_deep_research", schema, async (args, extra) => {
  const transport = server._transport;
  
  return await executeDeepResearch({
    query: args.query,
    onStreamChunk: async (chunk) => {
      await transport.send({
        jsonrpc: "2.0",
        method: "notifications/tools/stream",
        params: { toolName: "atypica_deep_research", ...chunk }
      });
    }
  });
});
```

**Pros:**
- ✅ Clean separation of concerns
- ✅ Works within MCP protocol
- ✅ Real-time streaming to clients
- ✅ Compatible with non-streaming clients
- ✅ Simple and maintainable

**Cons:**
- ⚠️ Custom notification type (not standard MCP)
- ⚠️ Requires transport access from tool handler

**Why We Chose This:**
- Best balance of simplicity and functionality
- Works with existing MCP SDK
- Provides real-time updates
- Easy to extend for other streaming tools

---

### Approach 2: Direct Transport Access

**Concept**: Access transport directly and write custom SSE events.

```typescript
async (args, extra) => {
  const transport = extra.transport; // If available
  const response = streamText({ model, messages: [...] });
  
  for await (const chunk of response.textStream) {
    await transport.writeSSE({
      event: "chunk",
      data: { chunk }
    });
  }
  
  return { result: await response.text };
}
```

**Pros:**
- Full control over streaming format
- Can use custom event types

**Cons:**
- ❌ Breaks MCP abstraction layer
- ❌ Transport may not be accessible from tool handler
- ❌ Non-standard approach
- ❌ Harder to maintain

**Why We Didn't Choose This:**
- Too low-level and fragile
- Breaks protocol abstraction
- Not portable to other transports

---

### Approach 3: Generator-Based Streaming

**Concept**: Make tool execution return an async generator.

```typescript
async function* executeDeepResearchStream(args) {
  const response = streamText({ model, messages: [...] });
  
  for await (const chunk of response.textStream) {
    yield { content: [{ type: "text", text: chunk }], isPartial: true };
  }
  
  yield { content: [{ type: "text", text: await response.text }], isPartial: false };
}

server.registerTool("atypica_deep_research", schema, async (args, extra) => {
  return executeDeepResearchStream(args);
});
```

**Pros:**
- Clean, composable design
- Natural streaming semantics
- Type-safe

**Cons:**
- ❌ Requires MCP SDK to support streaming tool results
- ❌ Not supported by current MCP SDK
- ❌ Would need custom server implementation
- ❌ More complex

**Why We Didn't Choose This:**
- MCP SDK doesn't support generator-based tool results
- Would require forking/extending the SDK
- Over-engineered for current needs

---

## Implementation Details

### AI SDK Streaming (streamText)

The AI SDK provides multiple ways to consume streams:

```typescript
const response = streamText({ model, messages: [...] });

// Option 1: textStream - only text deltas
for await (const textChunk of response.textStream) {
  console.log(textChunk); // string
}

// Option 2: fullStream - all events (text, reasoning, sources, tool-calls, etc.)
for await (const chunk of response.fullStream) {
  if (chunk.type === "text-delta") {
    console.log(chunk.text); // text delta
  } else if (chunk.type === "reasoning-delta") {
    console.log(chunk.text); // reasoning delta
  } else if (chunk.type === "source") {
    console.log(chunk.url, chunk.title); // source info
  }
  // ... other chunk types
}

// Option 3: onChunk callback
streamText({
  model,
  messages: [...],
  onChunk: async ({ chunk }) => {
    // Process each chunk
  }
});

// Option 4: Promises (consume entire stream)
const text = await response.text;
const usage = await response.usage;
```

**We chose `fullStream`** because:
- Provides all event types (text, reasoning, sources)
- Type-safe with discriminated union
- Can be iterated with `for await`
- Doesn't require callback configuration

### MCP StreamableHTTP Transport

The MCP transport provides:

```typescript
interface Transport {
  send(message: JSONRPCMessage, options?: { relatedRequestId?: RequestId }): Promise<void>;
  onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;
  // ... other methods
}

// StreamableHTTPServerTransport specifically:
class StreamableHTTPServerTransport implements Transport {
  async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Handles POST: JSON-RPC messages
    // Handles GET: SSE stream
    // Handles DELETE: Session termination
  }
  
  async send(message: JSONRPCMessage): Promise<void> {
    // Writes SSE event to stream:
    // event: message
    // data: {json}
  }
}
```

**Key insight:** `transport.send()` can send any JSON-RPC message, including notifications. We use custom notification type `notifications/tools/stream` for streaming chunks.

### Linking the Two

The connection happens in three places:

#### 1. Tool Execution (`tool.ts`)

```typescript
export async function executeDeepResearch({
  query,
  onStreamChunk, // Callback for streaming
}: DeepResearchInput & {
  onStreamChunk?: StreamChunkCallback;
}) {
  const response = streamText({ model, messages: [...] });
  
  if (onStreamChunk) {
    for await (const chunk of response.fullStream) {
      if (chunk.type === "text-delta") {
        await onStreamChunk({ type: "text-delta", text: chunk.text });
      }
      // ... handle other chunk types
    }
  }
  
  return { result: await response.text };
}
```

#### 2. Tool Registration (`server.ts`)

```typescript
server.registerTool("atypica_deep_research", schema, async (args, extra) => {
  const transport = (server as any)._transport as Transport;
  
  const result = await executeDeepResearch({
    query: args.query,
    abortSignal: extra.signal,
    onStreamChunk: transport
      ? async (chunk) => {
          await transport.send({
            jsonrpc: "2.0",
            method: "notifications/tools/stream",
            params: {
              toolName: "atypica_deep_research",
              chunkType: chunk.type,
              ...(chunk.text && { text: chunk.text }),
              ...(chunk.source && { source: chunk.source }),
              ...(chunk.usage && { usage: chunk.usage }),
            },
          });
        }
      : undefined,
  });
  
  return { content: [{ type: "text", text: result.result }] };
});
```

#### 3. API Route (`route.ts`)

```typescript
export async function POST(req: NextRequest) {
  const wantsSSE = req.headers.get("accept")?.includes("text/event-stream");
  
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless
    enableJsonResponse: !wantsSSE,
  });
  
  const server = getDeepResearchServer();
  await server.connect(transport);
  
  // Create streaming response adapter
  const { res, getStreamingResponse } = createStreamableServerResponse();
  
  // Handle request (this triggers tool execution and streaming)
  transport.handleRequest(incomingMessage, res, body);
  
  // Return SSE stream immediately
  return new Response(getStreamingResponse(), {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
```

## Data Flow

```
User Query
    ↓
POST /api/mcp
    ↓
StreamableHTTPServerTransport.handleRequest()
    ↓
MCP Server receives tools/call request
    ↓
Tool handler invoked
    ↓
executeDeepResearch() called with onStreamChunk callback
    ↓
streamText() starts execution
    ↓
For each chunk from fullStream:
    ├─ text-delta → onStreamChunk({ type: "text-delta", text })
    │                    ↓
    │              transport.send(notification)
    │                    ↓
    │              SSE event written to stream
    │                    ↓
    │              Client receives real-time update
    │
    ├─ reasoning-delta → similar flow
    ├─ source → similar flow
    └─ finish → similar flow with usage stats
    
After all chunks processed:
    ↓
Return final result
    ↓
transport.send(JSON-RPC response)
    ↓
SSE stream closes
```

## Benefits of This Approach

1. **Real-Time Updates**: Client sees text as it's generated
2. **Protocol Compliant**: Uses standard MCP JSON-RPC notifications
3. **Backward Compatible**: Non-streaming clients still work (get final result)
4. **Type Safe**: Full TypeScript support throughout
5. **Maintainable**: Clear separation of concerns
6. **Extensible**: Easy to add more streaming tools
7. **Testable**: Can test each component independently

## Limitations

1. **Custom Notification Type**: `notifications/tools/stream` is not standard MCP (yet)
2. **Transport Access**: Requires accessing `server._transport` (private field)
3. **No Backpressure**: Doesn't handle slow clients (could add buffering)
4. **No Resumability**: Can't resume interrupted streams (could add with event store)

## Future Improvements

1. **Standard Protocol**: Propose `notifications/tools/stream` to MCP spec
2. **Public API**: Request MCP SDK to expose transport in tool handler context
3. **Backpressure**: Add buffering and flow control for slow clients
4. **Resumability**: Implement event store for stream resumption
5. **Progress**: Add progress percentage estimates
6. **Metrics**: Track streaming performance and latency

