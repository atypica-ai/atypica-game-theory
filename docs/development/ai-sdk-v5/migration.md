# How We Migrated atypica.AI to AI SDK v5 Without Breaking 10M+ Chat Histories

atypica.AI is a multi-agent research platform where AI agents collaborate to conduct user research. Users ask business questions, and the system orchestrates multiple specialized agents—Study Agent plans research, Scout Agent discovers target users from social media, Interview Agent conducts automated interviews with AI personas, and Report Agent generates comprehensive insights. The entire process involves 30+ AI tools and generates extensive chat histories stored in PostgreSQL.

When Vercel released AI SDK v5 with breaking changes to message formats and tool APIs, we faced a challenge: migrate 200 files and 30+ tools while keeping 10 million+ existing chat conversations accessible. This article documents our 3-day migration journey.

**Final stats**: 200 files changed, 4,206 insertions, 3,094 deletions, 27 commits.

## The Core Breaking Change: Message → UIMessage

The most fundamental change in v5 is how messages are structured.

### v4: Message with content + parts

```typescript
// v4 Message
{
  id: "msg1",
  role: "assistant",
  content: "The weather is sunny",  // String representation
  parts: [                           // Structured data (optional)
    { type: "text", text: "The weather is " },
    { type: "tool-invocation", toolInvocation: { ... } },
    { type: "text", text: "sunny" }
  ]
}
```

In v4, you could use either `content` (simple string) or `parts` (structured array). Most of our code used `content` because it was simpler.

### v5: UIMessage with parts only

```typescript
// v5 UIMessage
{
  id: "msg1",
  role: "assistant",
  parts: [                           // Only source of truth
    { type: "text", text: "The weather is " },
    { type: "tool-getWeather", toolCallId: "...", state: "output-available", output: {...} },
    { type: "text", text: "sunny" }
  ],
  content: "The weather is sunny"   // Auto-generated, read-only
}
```

In v5, `parts` is the only source of truth. The `content` field is automatically derived from `parts` and is read-only.

**Migration impact**: Every place that accessed `message.content` needed to be refactored to iterate through `message.parts`.

## Day 1: Understanding the Scope

### Running the Codemod

```bash
npm install ai@^5.0.59 zod@^4.0.0
npx @ai-sdk/codemod@latest upgrade
```

The codemod handled mechanical replacements:

- Type name: `Message` → `UIMessage`
- Tool API: `parameters` → `inputSchema`
- Added `outputSchema` placeholders

But it left many FIXME comments because it couldn't understand semantic changes.

### The First Major Problem: Content Access

We had code like this everywhere:

```typescript
// v4 pattern - accessing content directly
const lastMessage = messages[messages.length - 1];
if (lastMessage.content.includes("weather")) {
  // ...
}

// For title generation
const title = message.content.substring(0, 50);

// For logging
logger.info({ userMessage: message.content });
```

**v5 migration**: We created a utility to extract text from parts:

```typescript
// messageUtils.ts
export function getTextFromParts(parts: UIMessage["parts"]): string {
  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

// Usage
const text = getTextFromParts(message.parts);
if (text.includes("weather")) {
  // ...
}
```

This pattern appeared in:

- Message persistence (16 files)
- UI components (25 files)
- API routes (15 files)
- Logging and analytics (8 files)

### Tool Invocation Structure Changed

This was the second major breaking change.

**v4 tool part structure:**

```typescript
{
  type: "tool-invocation",
  toolInvocation: {
    state: "result",
    toolCallId: "call_123",
    toolName: "searchPersonas",
    args: { query: "coffee lovers" },
    result: { personas: [...] }
  }
}
```

**v5 tool part structure:**

```typescript
{
  type: "tool-searchPersonas",      // Typed as tool-${toolName}
  toolCallId: "call_123",
  state: "output-available",        // States renamed
  input: { query: "coffee lovers" }, // args → input
  output: { personas: [...] }        // result → output
}
```

**Key changes**:

- Flattened structure (no nested `toolInvocation` object)
- Type is specific: `"tool-${toolName}"` not generic `"tool-invocation"`
- State names: `"call"` → `"input-available"`, `"result"` → `"output-available"`
- Field names: `args` → `input`, `result` → `output`
- Added error state: `"output-error"` with `errorText`

### Reasoning Format Changed

```typescript
// v4
{ type: "reasoning", reasoning: "Let me think..." }

// v5
{ type: "reasoning", text: "Let me think..." }
```

Field name changed from `reasoning` to `text`.

## Day 2: Backward Compatibility for 10M+ Messages

### The Database Challenge

Our PostgreSQL database stores messages in v4 format:

```sql
SELECT parts FROM chat_messages WHERE id = 'msg_old';
-- Returns v4 format with tool-invocation and reasoning fields
```

Users expect to:

1. Open old chat conversations
2. Continue conversations seamlessly
3. See tool results from old interactions

We couldn't migrate the database because:

- 10M+ messages across 50+ tables
- Downtime was unacceptable
- Risk of data corruption too high

### Solution: Conversion Layer

Created `src/ai/v4.ts`:

```typescript
export type V4ToolInvocation =
  | { state: "call"; toolCallId: string; toolName: string; args: any }
  | { state: "result"; toolCallId: string; toolName: string; args: any; result: any };

export type V4MessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; reasoning: string } // v4 format
  | { type: "tool-invocation"; toolInvocation: V4ToolInvocation };

export type V5MessagePart = UIMessage["parts"][number];

export function convertToV5MessagePart(part: V4MessagePart | V5MessagePart): V5MessagePart {
  // Text parts are identical in v4 and v5
  if (part.type === "text") {
    return part;
  }

  // Reasoning: reasoning field → text field
  if (part.type === "reasoning") {
    if ("reasoning" in part) {
      return { type: "reasoning", text: part.reasoning };
    }
    return part; // Already v5
  }

  // Tool invocation: nested → flat, args/result → input/output
  if (part.type === "tool-invocation" && "toolInvocation" in part) {
    const inv = part.toolInvocation;
    return {
      type: `tool-${inv.toolName}`,
      toolCallId: inv.toolCallId,
      state: inv.state === "result" ? "output-available" : "input-available",
      input: inv.args,
      output: inv.state === "result" ? inv.result : undefined,
    } as V5MessagePart;
  }

  // Already v5 format
  return part as V5MessagePart;
}
```

### Apply Conversion on Read

```typescript
// messageUtils.ts
export async function convertDBMessagesToAIMessages(userChatId: string): Promise<UIMessage[]> {
  const dbMessages = await prisma.chatMessage.findMany({
    where: { userChatId },
    orderBy: { createdAt: "asc" },
  });

  return dbMessages.map((msg) => ({
    id: msg.messageId,
    role: msg.role as "user" | "assistant",
    parts: (msg.parts as V4MessagePart[]).map(convertToV5MessagePart),
  }));
}
```

**Result**: Old messages load transparently. New messages save in v5 format. No database migration needed.

### Type System Reorganization

We have 5 independent chat systems with different tools:

- **Study**: 20+ tools (reasoning, search, interviews, reports, social media)
- **Interview**: 2 tools (endInterview, requestInteractionForm)
- **Persona**: 1 tool (endInterview)
- **NewStudy**: 1 tool (endInterview)
- **Agents**: 3 tools (thanks, hello, scout)

Initial approach: One global `UIToolConfigs` type.

**Problem**: Type pollution. Study components got autocomplete for Interview tools. Runtime errors from tool type mismatches.

**Solution**: Domain-specific tool types.

```typescript
// src/ai/tools/types.ts - Study system
export type StudyUITools = {
  reasoningThinking: {
    input: z.infer<typeof reasoningThinkingInputSchema>;
    output: z.infer<typeof reasoningThinkingOutputSchema>;
  };
  searchPersonas: {
    input: z.infer<typeof searchPersonasInputSchema>;
    output: z.infer<typeof searchPersonasOutputSchema>;
  };
  // ... 20+ other tools
};

export type TStudyMessageWithTool = UIMessage<unknown, UIDataTypes, StudyUITools>;

// src/app/(interviewProject)/tools/types.ts - Interview system
export type TInterviewUITools = {
  endInterview: {
    input: z.infer<typeof endInterviewInputSchema>;
    output: z.infer<typeof endInterviewOutputSchema>;
  };
  requestInteractionForm: {
    input: z.infer<typeof requestInteractionFormInputSchema>;
    output: z.infer<typeof requestInteractionFormOutputSchema>;
  };
};

export type TInterviewMessageWithTool = UIMessage<unknown, UIDataTypes, TInterviewUITools>;
```

Each domain gets its own directory structure:

```
src/app/(myDomain)/
├── tools/
│   ├── types.ts    # Tool type definitions
│   └── ui.tsx      # Tool UI rendering
└── types.ts        # Message type for this domain
```

**Benefit**: Full type safety within each domain. No cross-contamination.

## Day 3: UI Components and Model Messages

### Component Migration Pattern

Before v5, components accessed `content` directly:

```typescript
// v4 component
export function ChatMessage({ message }: { message: Message }) {
  return <div>{message.content}</div>;
}
```

After v5, components iterate over `parts`:

```typescript
// v5 component
export function ChatMessage({ message }: { message: UIMessage }) {
  return (
    <div>
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          return <Markdown key={i}>{part.text}</Markdown>;
        } else if (part.type === "reasoning") {
          return <ReasoningBlock key={i}>{part.text}</ReasoningBlock>;
        } else if (part.type.startsWith("tool-")) {
          return <ToolDisplay key={i} toolPart={part} />;
        }
      })}
    </div>
  );
}
```

**Tool detection pattern**:

```typescript
// v4
if (part.type === "tool-invocation") {
  const toolName = part.toolInvocation.toolName;
  const result = part.toolInvocation.result;
}

// v5
if (part.type.startsWith("tool-") && "toolCallId" in part) {
  const toolName = part.type.replace("tool-", "");
  const output = part.state === "output-available" ? part.output : undefined;
}
```

We migrated 25+ UI components with this pattern.

### The UIMessage vs ModelMessage Distinction

There's one more important detail: messages **to** the model have a different format.

**UIMessage** - From model, for UI:

```typescript
{
  role: "user",
  parts: [{ type: "text", text: "Hello" }]
}
```

**UserModelMessage** - To model:

```typescript
{
  role: "user",
  content: [{ type: "text", text: "Hello" }]  // Note: content, not parts
}
```

This only matters when constructing messages for `streamText` or `generateObject`:

```typescript
import { UserModelMessage } from "ai";

const result = await streamText({
  model: llm("gpt-4"),
  messages: [
    {
      role: "user",
      content: [{ type: "text", text: prompt }]  // content for model
    }
  ] as UserModelMessage[],
  tools: { ... }
});
```

We had to fix this in 30+ tool definitions and artifact generators.

### useChat Hook Changes

```typescript
// v4
const { append, reload, initialMessages } = useChat({
  id: chatId,
  experimental_prepareRequestBody({ messages, requestBody }) {
    return { message: messages[messages.length - 1], ...requestBody };
  },
});

// v5
const { sendMessage, regenerate, messages } = useChat({
  transport: new DefaultChatTransport({
    api: "/api/chat/study",
    prepareSendMessagesRequest({ id, messages }) {
      return {
        body: {
          id,
          message: messages[messages.length - 1],
          userChatToken: token,
        },
      };
    },
  }),
});
```

Hook method renames:

- `append` → `sendMessage`
- `reload` → `regenerate`
- `initialMessages` → `messages`

Transport config:

- `experimental_prepareRequestBody` → `prepareSendMessagesRequest`

### File Attachments

```typescript
// v4
{
  experimental_attachments: [{ name: "file.pdf", contentType: "application/pdf", url: "..." }];
}

// v5 - part of parts array
{
  parts: [{ type: "file", filename: "file.pdf", mediaType: "application/pdf", data: "..." }];
}
```

Field renames:

- `name` → `filename`
- `contentType` → `mediaType`
- `experimental_attachments` → part of `parts` array

### Streaming Message Persistence

**Key insight**: In v5, only check `parts.length`, not `content`.

```typescript
// v4 - check both
if (streamingMessage.parts?.length && streamingMessage.content.trim()) {
  await persistentAIMessageToDB(userChatId, streamingMessage);
}

// v5 - only check parts
if (streamingMessage.parts?.length) {
  await persistentAIMessageToDB(userChatId, streamingMessage);
}
```

The `content` field in v5 is derived from `parts`, so checking it is redundant.

## Critical Gotchas

### 1. Message Content is Read-Only in v5

```typescript
// v4 - this worked
message.content = "New text";

// v5 - this does nothing (content is derived)
message.content = "New text"; // ❌ Silently ignored

// v5 - correct way
message.parts = [{ type: "text", text: "New text" }]; // ✅
```

### 2. Empty Parts vs Empty Content

```typescript
// v4
if (message.content) { ... }

// v5 - this can be misleading
if (message.content) { ... }  // content is auto-generated, might be empty string

// v5 - correct check
if (message.parts.some(p => p.type === "text" && p.text)) { ... }
```

### 3. Tool State Names Changed

```typescript
// v4 states
"partial-call" | "call" | "result";

// v5 states
"input-available" | "output-available" | "output-error";
```

Don't forget to update all state checks.

### 4. Optional Tool Call Names

In edge cases (aborted streams, errors), `toolCall.toolName` might be undefined:

```typescript
// Safe access
step.toolCalls.map((call) => call?.toolName ?? "unknown");
```

### 5. Stream Event Field Names

```typescript
// v4
onFinish: async ({ reasoning, text, usage }) => {};

// v5
onFinish: async ({ reasoningText, text, usage }) => {};
```

### 6. Message ID Handling

Client messages might not have IDs:

```typescript
await persistentAIMessageToDB(userChatId, {
  ...newMessage,
  id: newMessage.id ?? generateId(),
});
```

## Migration Checklist

**Phase 1: Dependencies**

- [ ] Update `ai` to v5, `zod` to v4
- [ ] Run codemod: `npx @ai-sdk/codemod@latest upgrade`
- [ ] Fix TypeScript errors from `Message` → `UIMessage` rename

**Phase 2: Content Access**

- [ ] Find all `message.content` access
- [ ] Replace with parts iteration or utility function
- [ ] Update title generation, logging, analytics

**Phase 3: Tool Parts**

- [ ] Update tool detection: `"tool-invocation"` → `part.type.startsWith("tool-")`
- [ ] Change field access: `args`/`result` → `input`/`output`
- [ ] Update state checks: `"call"`/`"result"` → `"input-available"`/`"output-available"`
- [ ] Add `"output-error"` handling

**Phase 4: Backward Compatibility**

- [ ] Create v4 → v5 conversion utility
- [ ] Apply conversion when loading from database
- [ ] Test old chat histories thoroughly

**Phase 5: UI Components**

- [ ] Migrate all components to iterate over `parts`
- [ ] Update tool rendering logic
- [ ] Update file attachment components

**Phase 6: Tool Definitions**

- [ ] Change `parameters` → `inputSchema`
- [ ] Add `outputSchema`
- [ ] Import `UserModelMessage` for model messages
- [ ] Use `content` (not `parts`) when calling `streamText`/`generateObject`

**Phase 7: React Hooks**

- [ ] Update `useChat`: `append` → `sendMessage`, `reload` → `regenerate`
- [ ] Migrate `experimental_prepareRequestBody` → `prepareSendMessagesRequest`

**Phase 8: Edge Cases**

- [ ] Handle missing message IDs
- [ ] Handle undefined `toolCall.toolName`
- [ ] Update stream event handlers
- [ ] Remove `content.trim()` checks

## Key Insights

### 1. Content is Dead, Long Live Parts

The shift from `content` as source of truth to `parts` as source of truth is fundamental. Every message access pattern needs review.

Budget time for:

- Finding all `message.content` references (use global search)
- Understanding each usage context
- Deciding between iteration or utility function

### 2. The Codemod is 30% of the Work

The codemod handles:

- Type renames
- Basic API changes
- Obvious field renames

It doesn't handle:

- Semantic changes (`content` access patterns)
- Complex refactors (tool detection logic)
- Domain-specific decisions (type organization)

Budget 70% of time for post-codemod fixes.

### 3. Backward Compatibility is Non-Negotiable

Users don't care about your migration. Their old chats must just work.

Strategies:

- Convert on read (what we did)
- Convert on write (gradual migration)
- Dual schema (complex but zero risk)

We chose convert-on-read because:

- Zero downtime
- Simple to implement
- Low risk
- Works transparently

### 4. Type System Organization Matters

With multiple chat systems, proper type organization prevents:

- Tool type pollution
- Runtime errors from wrong tool usage
- Confusing autocomplete

Invest time in domain-specific types early.

### 5. Test Incrementally

We migrated systems in order of complexity:

1. Agents (simplest, 3 tools) - validate pattern
2. NewStudy (1 tool) - test in production
3. Persona (1 tool) - confidence building
4. Interview (2 tools) - more complex
5. Study (20+ tools) - final boss

Each system validated the patterns before applying them broadly.

## Results

**Before v5:**

- Inconsistent access patterns (`content` vs `parts`)
- Loose typing around tools
- `Message` type used everywhere

**After v5:**

- Single source of truth: `parts` array
- Full type safety across 30+ tools
- Domain-specific type organization
- Cleaner separation of concerns

**Time breakdown:**

- Day 1: Dependencies, codemod, content access patterns (8 hours)
- Day 2: Backward compatibility, type system (10 hours)
- Day 3: UI components, tool definitions, edge cases (6 hours)

Total: ~24 hours focused work over 3 days.

## Recommendations

1. **Budget 3-5 days**, not 1-2 days
2. **Start simple**: Migrate your simplest system first
3. **Build backward compatibility early**, not as afterthought
4. **Create utilities**: `getTextFromParts()`, `convertV4ToV5()`, etc.
5. **Organize types by domain** if you have multiple systems
6. **Test old data**: Load historical chats, verify tool results display
7. **Document the change**: Team needs to understand `parts` is source of truth

The migration is substantial but manageable with proper planning. v5's parts-based approach is more flexible and type-safe. The pain of migration is short-term; the benefits are long-term.
