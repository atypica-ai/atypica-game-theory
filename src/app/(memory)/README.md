# Memory System

This directory contains the implementation of the user memory system, inspired by Anthropic's CLAUDE.md approach.

## Overview

The memory system stores persistent information about users in a markdown format, which can be loaded as input to LLMs. This allows LLMs to provide more personalized and context-aware responses without requiring users to repeat information.

## Architecture

### Database Schema

- **Memory**: Supports both User and Team (mutually exclusive)
  - `core`: Markdown text (TEXT type, unlimited size)
  - `working`: JSON array for temporary knowledge
  - `version`: Tracks reorganization events
  - `changeNotes`: Notes about changes
  - `extra`: JSON for additional metadata

### Update Mechanisms

1. **Normal Update**: LLM agent analyzes conversation and inserts new information at a specific line index
2. **Reorganization**: When content exceeds threshold (8000 chars), agent reorganizes and summarizes the entire memory

### Key Components

- **Tools**: `memoryUpdate` (inserts new lines), `memoryReorganize` (internal, not used currently), `memoryNoUpdate` (no update needed)
- **Backend Function**: `updateMemory()` - main entry point that handles all DB operations and both mechanisms (agent logic inline using `generateText()`)
- **Prompts**: System prompts for memory update and reorganization agents

## Usage

### Updating Memory

```typescript
import { updateMemory } from "@/app/(memory)/lib/updateMemory";
import { rootLogger } from "@/lib/logging";

// For user memory
await updateMemory({
  userId: 123,
  conversationContext: messages, // ModelMessage[]
  logger: rootLogger.child({ userId: 123 }),
});

// For team memory
await updateMemory({
  teamId: 456,
  conversationContext: messages,
  logger: rootLogger.child({ teamId: 456 }),
});
```

### Loading Memory

```typescript
import { loadUserMemory } from "@/app/(memory)/lib/loadMemory";

const memoryContent = await loadUserMemory(userId);
// Use in system prompt:
const systemPrompt = `## User Memory\n\n${memoryContent}\n\n...`;
```

### Direct Function Call

Memory updates are done via direct function calls (no API endpoint needed):

```typescript
await updateMemory({
  userId: 123,
  conversationContext: messages,
  logger: rootLogger.child({ userId: 123 }),
});
```

## Configuration

- **MEMORY_THRESHOLD**: 8000 characters (triggers reorganization)
- **MEMORY_UPDATE_MODEL**: `claude-haiku-4-5` (fast, cost-effective)
- **MEMORY_REORGANIZE_MODEL**: `claude-sonnet-4-5` (more capable for complex tasks)

## Future Enhancements

- Memory sections (preferences, profile, context)
- Memory search capabilities
- Memory versioning and history
- Project/team level memory
- Memory analytics

## Files

- `lib/updateMemory.ts` - Main update logic (includes inline agent implementations)
- `lib/loadMemory.ts` - Load memory utilities
- `lib/utils.ts` - Utility functions (threshold checking)
- `tools/memoryUpdate/` - Tool for inserting new lines
- `tools/memoryReorganize/` - Tool for reorganization (internal)
- `tools/memoryNoUpdate/` - Tool for no-update cases
- `prompt/memoryUpdate.ts` - System prompt for update agent
- `prompt/memoryReorganize.ts` - System prompt for reorganize agent
