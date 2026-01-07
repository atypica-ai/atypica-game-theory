# Memory System Design

## Overview

This document describes the design and implementation of the user memory system for atypica-llm-app. The memory system is inspired by Anthropic's CLAUDE.md approach, providing a simple, transparent, and user-controlled way to store persistent information about users that can be loaded as input to LLMs.

## Goals

1. **Persistent User Memory**: Store user preferences, profile information, and context that persists across conversations
2. **Automatic Management**: LLM agents automatically update memory based on conversations
3. **Simple & Maintainable**: File-based approach (stored as markdown in database) without complex vector search
4. **Scalable**: Content reorganization when memory grows too large

## Architecture

### Phase 1: User-Level Memory Only

We start with user-level memory only. Future phases may add:
- Project-level memory
- Team-level memory
- Session-level memory

### Storage

Memory is stored in the database as markdown content, linked to each user:

```prisma
model Memory {
  id      Int  @id @default(autoincrement())
  // userId and teamId are mutually exclusive (but each user/team can have multiple versions)
  userId  Int?
  user    User? @relation("UserMemory", fields: [userId], references: [id], onDelete: Cascade)
  teamId  Int?
  team    Team? @relation("TeamMemory", fields: [teamId], references: [id], onDelete: Cascade)
  version Int

  core    String @default("") @db.Text // 核心记忆 (Markdown)
  working Json   @default("[]") // 工作记忆 (来自对话的待整合知识)

  changeNotes String @db.Text
  extra       Json   @default("{}")

  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @db.Timestamptz(6)

  @@unique([userId, version])
  @@unique([teamId, version])
  @@index([userId, version(sort: Desc)]) // Optimize for getting latest version
  @@index([teamId, version(sort: Desc)]) // Optimize for getting latest version
}
```

**Schema Design Rationale:**
- `userId`/`teamId`: Mutually exclusive, supports both user and team memory
- `core`: Markdown text stored as TEXT (unlimited size in PostgreSQL)
- `working`: JSON array for temporary knowledge from conversations
- `version`: Tracks reorganization events for debugging/auditing
- `changeNotes`: Human-readable notes about changes
- `extra`: JSON for additional metadata
- Versioning system allows multiple versions per user/team

### Memory Update Mechanisms

The system uses two mechanisms to manage memory content:

#### Mechanism 1: Normal Update (Append/Insert)

**Purpose**: Add new information to memory incrementally

**Process**:
1. LLM agent analyzes conversation context
2. Determines what new information should be remembered
3. Formats it as a markdown line
4. Specifies insertion point (line index)
5. Calls `memoryUpdate` tool to insert the new line

**Tool Specification**:
```typescript
memoryUpdate({
  lineIndex: number,  // 0-based index where to insert (0 = beginning, -1 = append)
  newLine: string     // Markdown line to insert
})
```

**System Prompt for memoryUpdate Agent**:
- Analyzes conversation to extract key information
- Determines if information is worth remembering (preferences, facts, context)
- Formats information concisely as markdown
- Chooses appropriate insertion point based on content structure
- Must call either `memoryUpdate` tool (with `{lineIndex: number, newLine: string}`) or `memoryNoUpdate` tool

#### Mechanism 2: Reorganization (Summarization)

**Purpose**: Compress and reorganize memory when it exceeds threshold

**Trigger**: When `content.length > MEMORY_THRESHOLD` (e.g., 8000 characters)

**Process**:
1. System detects threshold exceeded
2. Calls `memoryReorganize` agent
3. Agent analyzes entire memory content
4. Reorganizes, deduplicates, and summarizes
5. Returns new concise markdown content
6. Updates database with new content and increments version

**System Prompt for memoryReorganize Agent**:
- Analyzes entire memory content
- Identifies redundant or outdated information
- Reorganizes into logical sections
- Summarizes while preserving important details
- Maintains markdown structure
- Returns reorganized content directly as text (no tool needed)

### Backend Function: `updateMemory`

**Location**: `src/app/(memory)/lib/updateMemory.ts`

**Signature**:
```typescript
async function updateMemory({
  userId?,
  teamId?,
  conversationContext, // Recent messages for context
  logger,
}: {
  userId?: number;
  teamId?: number;
  conversationContext: ModelMessage[];
  logger: Logger;
}): Promise<void>
```

**Flow**:
1. Get latest Memory version for user/team
2. Check if `core.length > MEMORY_THRESHOLD`
3. If threshold exceeded:
   - Call `reorganizeMemoryContent()` (inline agent implementation using `generateText()`)
   - Create new version with reorganized content
   - Increment version
4. Always update with new information:
   - Call `updateMemoryContent()` (inline agent implementation using `generateText()`)
   - Agent uses `memoryUpdate` or `memoryNoUpdate` tool
   - If update needed, insert new line at specified index
   - Update or create Memory record in database
5. Log operation (fail gracefully on error)

**Constants**:
```typescript
const MEMORY_THRESHOLD = 8000; // characters
const MEMORY_UPDATE_MODEL = "claude-haiku-4-5"; // Fast, cost-effective
const MEMORY_REORGANIZE_MODEL = "claude-sonnet-4-5"; // More capable for complex reorganization
```

### Tool Implementation

#### `memoryUpdate` Tool

**Location**: `src/app/(memory)/tools/memoryUpdate/index.ts`

**Description**: Inserts a new line of information into user memory at a specific line index

**Input Schema**:
```typescript
{
  lineIndex: z.number().int().describe("0-based line index to insert after. Use -1 to append at end."),
  newLine: z.string().describe("Markdown line to insert. Should be concise and structured.")
}
```

**Output Schema**:
```typescript
{
  plainText: string // Confirmation message
}
```

**Implementation**:
1. Get latest Memory version for userId/teamId
2. Split core into lines
3. Validate lineIndex (must be -1 or between 0 and lines.length)
4. Insert newLine at specified position
5. Join lines back into core
6. Update latest version in database
7. Return confirmation

#### `memoryReorganize` Tool (Internal, Not Used)

**Location**: `src/app/(memory)/tools/memoryReorganize/index.ts`

**Description**: Tool definition exists but is not currently used

**Note**: The reorganization is done directly via `generateText()` without tool use. The agent returns reorganized text directly.

**Input/Output Schema**: Defined but not actively used in current implementation

### Agent Implementation (Inline in updateMemory.ts)

The memory system uses inline agent implementations within the `updateMemory()` function, rather than separate agent files. This simplifies the architecture while maintaining full functionality.

#### Memory Update Agent (Inline)

**Implementation**: Inside `updateMemoryContent()` function in `src/app/(memory)/lib/updateMemory.ts`

**System Prompt**: `src/app/(memory)/prompt/memoryUpdate.ts`
- Role: Memory extraction agent
- Task: Extract key information from conversation that should be remembered
- Guidelines:
  - Only remember persistent facts (preferences, profile, context)
  - Don't remember temporary conversation details
  - Format as concise markdown
  - Choose appropriate insertion point based on content structure
  - Must use `memoryUpdate` tool (with `lineIndex` and `newLine`) or `memoryNoUpdate` tool

**Model**: `claude-haiku-4-5` (fast, cost-effective for simple updates)

**Tool Choice**: `required` (agent must call one of the tools)

#### Memory Reorganize Agent (Inline)

**Implementation**: Inside `reorganizeMemoryContent()` function in `src/app/(memory)/lib/updateMemory.ts`

**System Prompt**: `src/app/(memory)/prompt/memoryReorganize.ts`
- Role: Memory organization specialist
- Task: Reorganize memory content to be concise while preserving important information
- Guidelines:
  - Remove redundant information
  - Group related information into sections
  - Maintain markdown structure
  - Preserve all important facts
  - Return clean, organized markdown as text

**Model**: `claude-sonnet-4-5` (more capable for complex reorganization)

**No Tool Use**: Agent returns reorganized content directly in `result.text`

### Direct Function Integration

**No API Route**: The memory system uses direct function calls rather than HTTP API endpoints.

**Usage Pattern**: Call `updateMemory()` directly from anywhere in the application:

```typescript
import { updateMemory } from "@/app/(memory)/lib/updateMemory";
import { rootLogger } from "@/lib/logging";

// In agent code or server actions
await updateMemory({
  userId: session.user.id,
  conversationContext: messages,
  logger: rootLogger.child({ userId: session.user.id }),
});
```

**Integration Example**: See `src/app/(study)/agents/baseAgentRequest.ts` where memory is updated at the start of each conversation using `waitUntil()` for non-blocking execution.

### Integration with LLM Agents

Memory content should be loaded and included in system prompts for relevant agents:

1. **Load Memory**: When starting a conversation, load user's/team's latest memory content using `loadUserMemory()` or `loadTeamMemory()`
2. **Include in System Prompt**: Add memory section to system prompt:
   ```
   ## User Memory

   ${memory.core}
   ```
3. **Update Memory**: Call `updateMemory()` function during conversations (typically non-blocking with `waitUntil()`)

### File Structure

```
src/app/(memory)/
├── lib/
│   ├── updateMemory.ts            # Main backend function with inline agent implementations
│   ├── loadMemory.ts              # Load memory utilities
│   └── utils.ts                   # Utility functions (threshold checking)
├── prompt/
│   ├── memoryUpdate.ts            # System prompt for update agent
│   └── memoryReorganize.ts        # System prompt for reorganize agent
├── tools/
│   ├── memoryUpdate/
│   │   ├── index.ts               # Tool implementation
│   │   └── types.ts               # Type definitions
│   ├── memoryReorganize/
│   │   ├── index.ts               # Tool definition (not actively used)
│   │   └── types.ts               # Type definitions
│   └── memoryNoUpdate/
│       ├── index.ts               # Tool for no-update cases
│       └── types.ts               # Type definitions
└── README.md                      # Quick reference documentation
```

### Error Handling

- **Memory not found**: Create new version with empty content
- **Invalid lineIndex**: Return error, don't update
- **Agent failure**: Log error, don't update memory (fail gracefully)
- **Database errors**: Log and throw (critical errors)

### Future Enhancements

1. **Memory Sections**: Organize into sections (preferences, profile, context)
2. **Memory Search**: Add semantic search for large memories
3. **Memory Versioning**: Track changes over time
4. **Memory Export/Import**: Allow users to export/import their memory
5. **Project/Team Memory**: Extend to project and team levels
6. **Memory Analytics**: Track what's being remembered and how often

### Testing Considerations

1. **Unit Tests**: Test line insertion logic
2. **Integration Tests**: Test full update flow with agents
3. **Threshold Tests**: Test reorganization trigger
4. **Edge Cases**: Empty memory, very long lines, invalid indices

## Implementation Status

1. ✅ Create design document
2. ✅ Create Prisma schema and migration
3. ✅ Implement `memoryUpdate` tool
4. ✅ Implement `memoryReorganize` tool (defined but not actively used)
5. ✅ Implement `memoryNoUpdate` tool
6. ✅ Create system prompts
7. ✅ Implement `updateMemory()` backend function with inline agents
8. ✅ Add memory loading utilities
9. ✅ Integration with Study Agent (baseAgentRequest.ts)
10. ✅ User capabilities page (view/edit memory)
11. ✅ Admin memory management page
12. 🔄 Future: Load and inject memory into agent system prompts

