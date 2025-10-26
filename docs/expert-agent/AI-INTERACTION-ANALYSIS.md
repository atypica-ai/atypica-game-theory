# Expert Agent System - AI Interaction Points Analysis

## Overview

This document provides a comprehensive analysis of all AI model interaction points in the expert agent system, following the design principles established in the main technical document (`README.md`). Each interaction point is analyzed for:

1. **Input requirements** - What data needs to be provided
2. **Output format** - Expected structure and format
3. **Context needs** - What contextual information should be included
4. **Multi-step consideration** - Whether reasoning/thinking should be used
5. **Tool requirements** - What tools might be needed
6. **Reference implementation** - How similar patterns are implemented in the codebase

---

## AI Interaction Points Mapping

### 1. Initial Content Processing

**Purpose**: Process user-provided initial content (text/file/voice) when creating a new expert

**Trigger**: When user uploads initial content during expert creation (Phase 1)

**Input**:
- Content type: `"text" | "file" | "voice"`
- Raw content: string or file data
- Expert context: name, domain, locale
- File metadata (if applicable): filename, mimetype, size

**Output Format**:
```typescript
{
  extractedContent: string;      // Processed text content
  suggestedCategories: string[]; // Suggested topic categories
  keyPoints: string[];          // Key knowledge points identified
  contentQuality: {
    completeness: number;        // 0-1 score
    clarity: number;             // 0-1 score
    depth: number;               // 0-1 score
  }
}
```

**Context Needs**:
- Expert's domain and intended expertise
- Language/locale for processing
- Purpose of the expert (to guide extraction)

**Multi-step Consideration**:
- **NO** - Single-pass extraction is sufficient
- Use `generateObject` with structured output schema

**Tools Needed**:
- None for basic extraction
- Potentially file parsing tools (PDF, Word, etc.)

**Reference Implementation**:
- Similar to: `src/ai/tools/experts/buildPersona/index.ts` (persona building from source)
- File handling: `src/lib/attachments/actions.ts` (file processing)

**Model Recommendation**:
- `gemini-2.5-flash` (fast, good at document understanding)
- Alternative: `gpt-4o` (for complex documents)

---

### 2. Memory Extraction and Categorization

**Purpose**: Extract structured memories from processed content and categorize them by topic

**Trigger**: After initial content processing, to create memory entries

**Input**:
- Processed content text
- Expert domain and expertise areas
- Locale
- Existing categories (if any)

**Output Format**:
```typescript
{
  memories: Array<{
    content: string;           // The memory text (detailed)
    category: string;          // Topic category
    tags: string[];            // Related tags
    importance: "high" | "medium" | "low";
    relatedMemories?: string[]; // IDs of related memories
  }>;
  suggestedNewCategories: string[]; // New categories discovered
}
```

**Context Needs**:
- Expert's existing knowledge structure
- Domain-specific terminology
- Language/locale for categorization

**Multi-step Consideration**:
- **YES** - Use reasoning for complex content with many topics
- Chain of Thought: Analyze content → Identify themes → Extract memories → Categorize

**Tools Needed**:
- None required (pure analysis task)

**Reference Implementation**:
- Similar to: `src/ai/prompt/buildPersona.ts` (persona analysis and structuring)
- Memory pattern: `ExpertMemory` model in database schema

**Model Recommendation**:
- `claude-sonnet-4` (excellent at structured analysis and categorization)
- Alternative: `gpt-4o` (good reasoning capabilities)

---

### 3. Memory Document Generation

**Purpose**: Generate a comprehensive Memory Document (like CLAUDE.md) from memory entries

**Trigger**: After memory extraction or when updating the expert's knowledge base

**Input**:
- All memory entries (categorized)
- Expert profile (name, domain, expertise)
- Locale
- Previous Memory Document (if updating)

**Output Format**:
```markdown
# Expert Profile
- Name: [Expert Name]
- Domain: [Professional Domain]
- Expertise: [List of expertise areas]
- Language: [Primary Language]

# Core Knowledge

## Topic 1: [Category Name]
### Key Points
- [Detailed knowledge point with context]
- [Another knowledge point]

### Insights
- [Deep insights and analysis]

### Experience
- [Practical experience and examples]

## Topic 2: [Another Category]
...

# Conversation Style
[Description of how the expert communicates]
- Tone: [Formal/Casual/Technical]
- Approach: [Analytical/Empathetic/Direct]
- Signature phrases: [Common expressions]

# Knowledge Boundaries
- Current strengths: [Areas of expertise]
- Known limitations: [What the expert doesn't know]
- Learning areas: [Topics to expand on]

# Update History
- [Date]: [What was updated]
```

**Context Needs**:
- All memory entries with full context
- Expert's intended audience and use cases
- Conversation examples (if available)

**Multi-step Consideration**:
- **YES** - Complex synthesis task requiring deep thinking
- Process:
  1. Analyze all memories and identify themes
  2. Structure knowledge hierarchically
  3. Synthesize insights across memories
  4. Generate coherent narrative
  5. Define boundaries and style

**Tools Needed**:
- None (pure synthesis task)

**Reference Implementation**:
- Similar to: `src/ai/prompt/buildPersona.ts` (persona prompt generation)
- Pattern: Building structured documents from scattered information
- Inspiration: How CLAUDE.md is structured for context

**Model Recommendation**:
- `claude-sonnet-4-5` (excellent at long-form synthesis and maintaining coherence)
- Alternative: `gpt-5` (strong at structured content generation)

---

### 4. Knowledge Completeness Analysis

**Purpose**: Analyze current knowledge to identify gaps and completeness levels

**Trigger**:
- After initial Memory Document generation
- Before suggesting supplementary interviews
- On-demand when user requests analysis

**Input**:
- Current Memory Document
- Expert domain and intended expertise
- Recent conversation history (if available)
- Locale

**Output Format**:
```typescript
{
  overallScore: number;         // 0-100 overall completeness
  dimensions: Array<{
    name: string;               // e.g., "Technical Depth", "Practical Experience"
    score: number;              // 0-100
    level: "high" | "medium" | "low";
    assessment: string;         // Detailed explanation
    improvementSuggestions: string[];
  }>;
  knowledgeGaps: Array<{
    area: string;               // Knowledge area with gaps
    severity: "critical" | "important" | "nice-to-have";
    description: string;        // What's missing
    impact: string;             // Why it matters
    suggestedQuestions: string[]; // Questions to fill the gap
  }>;
  strengths: string[];          // What the expert knows well
  recommendations: string[];    // Overall recommendations
}
```

**Context Needs**:
- Expert's domain and intended use cases
- Industry standards or best practices for the domain
- Similar expert profiles (for comparison)

**Multi-step Consideration**:
- **YES** - Requires systematic analysis across multiple dimensions
- Chain of Thought:
  1. Define evaluation dimensions for the domain
  2. Assess each dimension against standards
  3. Identify specific gaps
  4. Prioritize gaps by importance
  5. Generate improvement suggestions

**Tools Needed**:
- Potentially: `google_search` to understand domain standards
- Potentially: `webSearch` for industry best practices

**Reference Implementation**:
- Pattern similar to: `src/ai/tools/experts/reasoning/index.ts` (deep analysis)
- Evaluation approach: Multi-dimensional assessment with structured output

**Model Recommendation**:
- `claude-sonnet-4` (excellent at nuanced evaluation and gap analysis)
- Alternative: `o3-mini` (strong reasoning for systematic analysis)

---

### 5. Interview Question Generation

**Purpose**: Generate targeted questions for supplementary interviews to fill knowledge gaps

**Trigger**:
- After knowledge completeness analysis
- When user initiates supplementary interview
- During daily memory update suggestions

**Input**:
- Knowledge gaps identified
- Expert domain and current knowledge
- Interview context (what we're trying to learn)
- Preferred interview style
- Locale

**Output Format**:
```typescript
{
  interviewPurpose: string;     // Overall goal of this interview
  focusAreas: string[];         // Key areas to cover
  questions: Array<{
    question: string;           // The actual question
    purpose: string;            // Why we're asking this
    followUps: string[];        // Potential follow-up questions
    expectedInsights: string[]; // What we hope to learn
    priority: "high" | "medium" | "low";
  }>;
  interviewGuidance: {
    openingMessage: string;     // How to start the interview
    probingTechniques: string[]; // How to dig deeper
    closingMessage: string;     // How to wrap up
  };
  estimatedDuration: string;    // e.g., "10-15 minutes"
  questionCount: number;
}
```

**Context Needs**:
- Current Memory Document
- Identified knowledge gaps
- Previous interview history (to avoid repetition)
- Interview methodology (based on atypica's interview patterns)

**Multi-step Consideration**:
- **YES** - Requires thoughtful question design
- Process:
  1. Analyze knowledge gaps
  2. Prioritize what to learn
  3. Design questions that elicit deep responses
  4. Sequence questions logically
  5. Prepare follow-up strategies

**Tools Needed**:
- None (question generation task)

**Reference Implementation**:
- Similar to: `src/ai/prompt/interview.ts` (interview system)
- Pattern: `src/ai/tools/experts/interviewChat/index.ts` (interview execution)
- Methodology: atypica's professional interview techniques

**Model Recommendation**:
- `claude-sonnet-4` (excellent at empathetic question design)
- Alternative: `gpt-4o` (good at structured question generation)

---

### 6. Expert Chat Response (with Memory Retrieval)

**Purpose**: Generate expert responses during chat conversations, using Memory Document and retrieved memories

**Trigger**: User asks a question or engages in conversation with the expert

**Input**:
- User's question/message
- Conversation history
- Memory Document (full)
- Retrieved relevant memories (top-k by similarity)
- Expert's allowed tools configuration
- Locale

**System Prompt Structure**:
```typescript
{
  // Base context from Memory Document
  memoryDocument: string;

  // Retrieved relevant memories
  relevantMemories: Array<{
    content: string;
    category: string;
    source: string;
  }>;

  // Expert identity and behavior
  expertRole: {
    name: string;
    domain: string;
    conversationStyle: string;
  };

  // Instructions
  instructions: string; // How to use memories, boundaries, tools
}
```

**Output Format**:
- Streaming text response
- Optional: Tool calls (deep research, web search)
- Response should include:
  - Direct answer
  - Supporting details from memories
  - Acknowledgment of boundaries (what they don't know)

**Context Needs**:
- Full Memory Document as system context
- Retrieved memories as additional context
- Conversation history (recent N messages)
- User's preferences/style

**Multi-step Consideration**:
- **CONDITIONAL** - Use reasoning tool for complex questions
- Normal questions: Direct response
- Complex questions: Call `reasoningThinking` tool for deeper analysis

**Tools Needed**:
```typescript
{
  reasoningThinking: reasoningThinkingTool, // For deep analysis
  google_search: google.tools.googleSearch, // For current info
  // Future: webSearch, deepResearch, etc.
}
```

**Reference Implementation**:
- Pattern: `src/app/(persona)/(chat)/api/chat/persona/route.ts` (persona chat)
- System prompt: `src/ai/prompt/personaAgent.ts` (how to embody a persona)
- Memory retrieval: Vector similarity search pattern from existing persona system

**Model Recommendation**:
- `gemini-2.5-flash` (fast, good at conversation, supports tools)
- Alternative: `claude-3-7-sonnet` (excellent at role-playing)
- For complex queries: `claude-sonnet-4` or `gpt-4o` with reasoning

**Streaming Pattern**:
```typescript
streamText({
  model: llm("gemini-2.5-flash"),
  system: expertSystemPrompt,
  messages: conversationHistory,
  tools: allowedTools,
  stopWhen: stepCountIs(2), // Limit multi-step
  experimental_transform: smoothStream({
    delayInMs: 30,
    chunking: /[\u4E00-\u9FFF]|\S+\s+/,
  }),
  onStepFinish: async (step) => {
    await saveStepToDB(step);
    await trackTokenUsage(step);
  }
})
```

---

### 7. Interview Conversation Management

**Purpose**: Conduct a supplementary interview to gather missing knowledge

**Trigger**: User starts a supplementary interview session

**Input**:
- Interview questions (from #5)
- Expert's current knowledge (Memory Document)
- User responses as conversation progresses
- Locale

**System Prompt Structure**:
```typescript
{
  role: "Knowledge Interviewer",
  context: {
    expertName: string;
    expertDomain: string;
    interviewPurpose: string;
    focusAreas: string[];
  },
  methodology: {
    // Professional interview techniques
    probingTechniques: string[];
    conversationGuidelines: string[];
  },
  questions: PreparedQuestion[];
}
```

**Output Format**:
- Streaming conversation (one question at a time)
- Follow-up questions based on responses
- At end: Structured summary of learnings

**Context Needs**:
- Current Memory Document (to know what we already know)
- Interview plan (questions and focus areas)
- Conversation history

**Multi-step Consideration**:
- **YES** - Interview is inherently multi-step
- Flow:
  1. Opening and rapport building
  2. Ask prepared questions
  3. Listen and probe deeper (5 whys technique)
  4. Follow-up based on responses
  5. Synthesize learnings
  6. Close naturally

**Tools Needed**:
```typescript
{
  saveInterviewConclusion: tool({
    // Save structured summary at end
  })
}
```

**Reference Implementation**:
- Core pattern: `src/ai/prompt/interview.ts` (interviewer system)
- Similar flow: `src/app/(interviewProject)/(session)/api/chat/interview-agent/route.ts`
- Methodology: Professional interview techniques from atypica system

**Model Recommendation**:
- `claude-sonnet-4` (excellent at empathetic conversation and probing)
- Alternative: `gemini-2.5-pro` (good at following complex instructions)

**Special Considerations**:
- Keep questions concise (≤80 characters)
- Avoid repetition
- Adapt to user's style
- Control pace (5-7 rounds of dialogue)
- Natural closure

---

### 8. Interview Summary and Memory Update

**Purpose**: Synthesize interview conversation into new memory entries and update Memory Document

**Trigger**: After interview conversation completes

**Input**:
- Full interview transcript
- Original interview purpose and focus areas
- Existing Memory Document
- Expert profile
- Locale

**Output Format**:
```typescript
{
  summary: {
    interviewPurpose: string;
    keyDiscoveries: string[];
    insights: string[];
    quotableExcerpts: string[]; // Memorable dialogue
  };
  newMemories: Array<{
    content: string;
    category: string;
    tags: string[];
    source: "interview";
    sourceId: string; // Interview ID
    importance: "high" | "medium" | "low";
  }>;
  memoryDocumentUpdates: {
    sectionsToAdd: Array<{
      category: string;
      content: string;
    }>;
    sectionsToUpdate: Array<{
      category: string;
      additionalContent: string;
    }>;
  };
  knowledgeGrowth: {
    areasImproved: string[];
    gapsRemaining: string[];
    nextSteps: string[];
  };
}
```

**Context Needs**:
- Full interview transcript
- Current Memory Document
- Expert's domain knowledge
- Interview objectives

**Multi-step Consideration**:
- **YES** - Complex synthesis task
- Chain of Thought:
  1. Review interview transcript
  2. Extract key information and insights
  3. Identify new knowledge vs. confirming existing
  4. Categorize learnings
  5. Generate memory entries
  6. Plan Memory Document updates
  7. Assess knowledge growth

**Tools Needed**:
- None (synthesis and analysis task)

**Reference Implementation**:
- Pattern: `src/ai/tools/system/saveInterviewConclusion/index.ts`
- Similar: Building structured output from conversation
- Memory update: Similar to initial memory extraction (#2)

**Model Recommendation**:
- `claude-sonnet-4` (excellent at synthesis and extracting insights)
- Alternative: `gpt-4o` (good at structured analysis)

---

### 9. Daily Summary and Gap Identification

**Purpose**: Analyze recent conversations to identify emerging knowledge gaps and generate update suggestions

**Trigger**:
- Scheduled daily job
- After N conversations
- On-demand by user

**Input**:
- Recent conversations (past 24 hours or last N chats)
- Current Memory Document
- Expert's domain
- Locale

**Output Format**:
```typescript
{
  summary: {
    conversationCount: number;
    topicsDiscussed: string[];
    commonQuestions: string[];
    performanceMetrics: {
      questionsAnswered: number;
      toolCallsUsed: number;
      averageResponseQuality: number;
    };
  };
  knowledgeGaps: Array<{
    area: string;
    severity: "high" | "medium" | "low";
    evidence: string; // From conversations
    frequency: number; // How often it came up
    suggestedQuestion: string;
  }>;
  recommendations: {
    priorityGaps: string[]; // What to address first
    interviewSuggestion: {
      shouldInterview: boolean;
      estimatedQuestions: number;
      focusAreas: string[];
    };
  };
  conversationInsights: {
    userSatisfaction: "high" | "medium" | "low";
    areasOfExcellence: string[];
    areasNeedingImprovement: string[];
  };
}
```

**Context Needs**:
- Full Memory Document
- Recent conversation transcripts
- Expert's performance history

**Multi-step Consideration**:
- **YES** - Complex analysis across multiple conversations
- Process:
  1. Analyze each conversation
  2. Identify patterns and recurring themes
  3. Detect when expert struggled or gave vague answers
  4. Map gaps to knowledge areas
  5. Prioritize by impact
  6. Generate actionable recommendations

**Tools Needed**:
- None (analysis task)

**Reference Implementation**:
- Similar to: Daily summary patterns in existing system
- Analysis pattern: Knowledge gap detection (#4)

**Model Recommendation**:
- `claude-sonnet-4` (excellent at pattern recognition and synthesis)
- Alternative: `o3-mini` (strong reasoning for systematic analysis)

---

### 10. Memory Document Update (Incremental)

**Purpose**: Update Memory Document when new memories are added without regenerating everything

**Trigger**:
- After interview
- After adding manual memories
- After conversation generates new insights

**Input**:
- Current Memory Document
- New memory entries to integrate
- Expert profile
- Locale

**Output Format**:
```markdown
# Updated Memory Document
[Full updated document with new memories integrated]

# Update Summary
- Sections modified: [list]
- New knowledge added: [summary]
- Existing knowledge enhanced: [summary]
```

**Context Needs**:
- Current Memory Document
- New memories with full context
- Categorization of new memories

**Multi-step Consideration**:
- **CONDITIONAL** - Depends on update size
- Small updates: Direct integration
- Large updates: Multi-step synthesis to maintain coherence

**Tools Needed**:
- None (document editing task)

**Reference Implementation**:
- Pattern: Incremental document updates
- Similar to: How Memory Document is initially built (#3)

**Model Recommendation**:
- `claude-sonnet-4` (excellent at document editing and coherence)
- Alternative: `gpt-4o` (good at structured content integration)

---

### 11. System Prompt Generation (from Memory Document)

**Purpose**: Generate an optimized system prompt for the expert based on Memory Document

**Trigger**:
- After Memory Document is created/updated
- When preparing for chat session

**Input**:
- Memory Document (full)
- Expert profile
- Locale
- Target model (may affect prompt optimization)

**Output Format**:
```typescript
{
  systemPrompt: string; // Optimized prompt for chat
  promptSections: {
    identity: string;
    knowledge: string;
    style: string;
    boundaries: string;
    instructions: string;
  };
  metadata: {
    tokenCount: number;
    optimizedFor: string; // Model name
    version: string;
  };
}
```

**Context Needs**:
- Full Memory Document
- Target use case (chat, consultation, etc.)
- Model capabilities and limits

**Multi-step Consideration**:
- **NO** - Straightforward transformation
- Memory Document → Optimized System Prompt

**Tools Needed**:
- None (prompt engineering task)

**Reference Implementation**:
- Pattern: `src/ai/prompt/personaAgent.ts` (persona system prompt)
- Similar: How system prompts are structured for different agents

**Model Recommendation**:
- `claude-sonnet-4` (excellent at prompt optimization)
- Could also be template-based without AI if format is standardized

---

## Cross-Cutting Concerns

### Token Usage Tracking

All AI interactions must track token usage:

```typescript
onStepFinish: async (step) => {
  const { tokens, extra } = calculateStepTokensUsage(step);

  await statReport("tokens", tokens, {
    reportedBy: "expert_system",
    expertId: expert.id,
    interactionType: "memory_generation", // or other types
    modelName: step.model,
    ...extra,
  });
}
```

### Error Handling

All AI calls should include:
- Retry logic for transient failures
- Abort signal support for cancellation
- Comprehensive error logging
- Graceful degradation

```typescript
const result = await generateText({
  model: llm("claude-sonnet-4"),
  maxRetries: 3,
  abortSignal: mergedAbortSignal,
  onError: ({ error }) => {
    logger.error("AI operation failed", {
      error: error.message,
      expertId,
      operation: "memory_generation",
    });
  },
});
```

### Caching Strategy

For frequently accessed data:
- Memory Documents should be cached
- Retrieved memories should use cache when possible
- System prompts can be pre-generated and cached

### Language Detection

Use dynamic language detection for user inputs:

```typescript
const locale = await detectInputLanguage({
  text: userInput,
  fallbackLocale: expert.locale,
});
```

---

## Model Selection Guidelines

### By Use Case

1. **Fast Processing** (content extraction, simple categorization)
   - Primary: `gemini-2.5-flash`
   - Fallback: `gpt-4.1-mini`

2. **Deep Analysis** (knowledge gaps, completeness analysis)
   - Primary: `claude-sonnet-4`
   - Fallback: `o3-mini`

3. **Synthesis** (Memory Document generation, interview summaries)
   - Primary: `claude-sonnet-4-5`
   - Fallback: `gpt-5`

4. **Conversation** (chat, interviews)
   - Primary: `gemini-2.5-flash` (fast, good enough)
   - Upgrade: `claude-3-7-sonnet` (better role-playing)

5. **Reasoning** (complex questions, multi-step thinking)
   - Primary: `gemini-2.5-pro` with reasoning
   - Fallback: `o3-mini`

### Cost Optimization

- Use cheaper models for initial drafts
- Use premium models for final generation
- Implement prompt caching where supported (Claude, GPT-4o)
- Consider model waterfall: try fast model first, upgrade if needed

---

## Comparison with Claude Code's Approach

### How Claude Code Uses CLAUDE.md

1. **As System Context**: CLAUDE.md is loaded as part of system prompt
2. **Comprehensive Instructions**: Contains project overview, commands, architecture, conventions
3. **Always Available**: Loaded for every request
4. **Structured Format**: Clear sections, code examples, best practices

### What We Can Learn

1. **Memory Document Structure**
   - Should be comprehensive like CLAUDE.md
   - Should include examples and patterns
   - Should define behavior and boundaries
   - Should be well-organized with clear sections

2. **System Prompt Design**
   - Start with identity and role
   - Provide rich context (Memory Document)
   - Include specific instructions
   - Define boundaries and limitations

3. **Multi-step Reasoning**
   - Use reasoning tools for complex questions
   - Allow model to think step-by-step
   - Synthesize final answer from reasoning

4. **Tool Integration**
   - Provide tools when appropriate
   - Let model decide when to use tools
   - Tools enhance capabilities (search, research)

### Our Expert Agent Adaptation

```typescript
// Similar to how Claude Code uses CLAUDE.md
const expertSystemPrompt = `
${expert.memoryDocument}  // Like CLAUDE.md content

You are ${expert.name}, an expert in ${expert.domain}.

Use your Memory Document above as your knowledge base.

When answering questions:
1. Draw from your documented knowledge
2. Reference specific memories when relevant
3. Be honest about knowledge boundaries
4. Use tools when needed for current information
5. Maintain your conversation style

# Relevant Memories for Current Query
${relevantMemories.map(m => `
## ${m.category}
${m.content}
`).join('\n')}

# Current Conversation Context
[Recent conversation history]
`;
```

---

## Implementation Priorities

### Phase 1: Core Memory System (MVP)
1. ✅ Initial content processing (#1)
2. ✅ Memory extraction and categorization (#2)
3. ✅ Memory Document generation (#3)
4. ✅ Expert chat response (#6)

### Phase 2: Intelligent Enhancement
5. ✅ Knowledge completeness analysis (#4)
6. ✅ Interview question generation (#5)
7. ✅ Interview conversation management (#7)
8. ✅ Interview summary and memory update (#8)

### Phase 3: Automation
9. ✅ Daily summary and gap identification (#9)
10. ✅ Memory Document update (incremental) (#10)
11. ✅ System prompt optimization (#11)

---

## Next Steps

1. **Create Prompt Templates Document**
   - Document: `PROMPT-TEMPLATES.md`
   - Include all system prompts for each interaction point
   - Provide examples with actual data
   - Include i18n (Chinese + English)

2. **Implement Core AI Functions**
   - Create AI service layer functions for each interaction point
   - Follow established patterns from existing codebase
   - Include comprehensive error handling and logging

3. **Test with Real Data**
   - Use example expert scenarios
   - Test with different content types
   - Validate output quality
   - Measure token usage

4. **Optimize and Iterate**
   - A/B test different models
   - Optimize prompts based on results
   - Implement caching strategies
   - Monitor costs and performance

---

## Document Version

- **Version**: 1.0
- **Last Updated**: 2025-10-26
- **Author**: Analysis based on expert agent design and existing atypica.AI patterns
