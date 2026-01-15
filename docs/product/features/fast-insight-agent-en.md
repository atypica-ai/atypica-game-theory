# Fast Insight Agent - Podcast-Driven Rapid Insights

## Core Concept

Fast Insight Agent is atypica.AI's podcast-first research agent, focused on **rapidly generating high-quality, in-depth, and engaging podcast content**. Unlike traditional research reports, Fast Insight Agent transforms insights into listenable audio content, enabling users to efficiently consume business and current affairs insights during commutes, workouts, or household chores.

### Design Philosophy

**1. Podcast-First, Reports Optional**

Traditional research prioritizes written reports as the main deliverable. Fast Insight Agent takes the opposite approach:

- **Primary Output**: Podcast audio + script (15-20 minutes, structured dialogue)
- **Optional Output**: High-density quick-read reports (supplementary detailed data)

**2. Speed Meets Depth**

- **Maximum Steps**: 10 steps (vs. 20+ steps for standard research)
- **Optimized Toolchain**: 7 curated tools (vs. 20+ tools for standard research)
- **Parallel Execution**: Deep research (deepResearch) + podcast planning (planPodcast) completed in one go

**3. Strict Workflow, Quality Guaranteed**

Fast Insight Agent employs a 5-stage linear process with clear validation checkpoints at each stage. The AI cannot skip any required steps:

```
Topic Understanding → Podcast Planning → Deep Research → Podcast Generation → Research Complete
   ↓                    ↓                  ↓                ↓                    ↓
webSearch           planPodcast        deepResearch     generatePodcast      (optional: report)
```

---

## Overview: Fast Insight vs Standard Research

| **Dimension** | **Fast Insight Agent** | **Study Agent (Standard Research)** |
|----------|------------------------|---------------------------|
| **Primary Output** | Podcast audio + script | Research reports |
| **Trigger** | User explicitly requests "podcast"/"audio content" | General research needs |
| **Research Type (kind)** | `fastInsight` (fixed) | 7 types (testing/insights/creation/planning/misc/productRnD/fastInsight) |
| **Max Steps** | 10 steps | 20+ steps |
| **Tool Count** | 7 curated tools | 20+ comprehensive toolset |
| **Execution Speed** | Fast (5-10 minutes) | Slower (15-30 minutes) |
| **Main Model** | Claude Sonnet 4.5 | Claude Sonnet 4.5 |
| **Planning Model** | Gemini 2.5 Pro (planPodcast) | Claude Sonnet 4 (planStudy) |
| **webSearch Limit** | Max 3 times (only 1 before planPodcast) | No hard limit |
| **Research Methods** | Not supported (no interviewChat/discussionChat/scoutTaskChat) | Supported (1-on-1 interviews, group discussions, social media observation) |
| **AI Personas** | Not used | Extensively used (Tier 1-3 quality system) |
| **Use Cases** | Hot topics, rapid insights, content marketing | Deep business decisions, product innovation, user research |

### Core Difference: Research Methods

| **Research Method** | **Fast Insight** | **Study Agent** |
|-------------|------------------|-----------------|
| **interviewChat** (1-on-1 in-depth interviews) | ❌ Not supported | ✅ 5-10 people, 30 min/person |
| **discussionChat** (Group discussions) | ❌ Not supported | ✅ 3-8 people, opinion clashes |
| **scoutTaskChat** (Social media observation) | ❌ Not supported | ✅ 3 stages: observe → reason → verify |
| **deepResearch** (Deep research) | ✅ Only research method | ✅ One of several methods |

**Key Insight**:
- **Fast Insight**: Rapidly gathers insights through `deepResearch` (web search + X search + AI reasoning), ideal for time-sensitive topics
- **Study Agent**: Simulates real humans through AI Personas, conducts deep interviews to capture subjective emotions and decision logic, ideal for understanding "why"

---

## Detailed Feature Breakdown

### I. Workflow: 5-Stage Linear Execution

#### Stage 1: Topic Understanding and Clarification

**Objective**: Quickly grasp background information on the research topic

**Tools**:
- `webSearch` (Perplexity provider): Rapidly collect background information, latest developments, key concepts

**Key Constraints**:
- **Limited to 1 use** of webSearch (before planPodcast)
- All collected information must be documented in detail and integrated into planPodcast

**Validation Checkpoint**:
- ✅ Sufficient background information collected via webSearch
- ✅ User's research topic and objectives fully understood

**Implementation Details**:
```typescript
// src/app/(study)/agents/configs/fastInsightAgentConfig.ts
customPrepareStep: async ({ messages }) => {
  const toolUseCount = calculateToolUsage(messages);

  // Limit webSearch usage (fast insight doesn't have planStudy)
  if ((toolUseCount[StudyToolName.webSearch] ?? 0) >= 3) {
    activeTools = (Object.keys(tools) as (keyof TOOLS)[]).filter(
      (toolName) => toolName !== StudyToolName.webSearch,
    );
  }

  return { messages, activeTools };
}
```

---

#### Stage 2: Podcast Planning

**Objective**: Plan podcast content strategy and deep search strategy

**Tools**:
- `planPodcast`:
  - **Model**: Gemini 2.5 Pro (fast and supports Google Search grounding)
  - **Integrated Tools**: google_search (MODE_DYNAMIC, dynamicThreshold=0, ensures search always occurs)
  - **Key Parameters**:
    - `background`: Contains all background information collected by webSearch
    - `question`: User's research question or topic

**Output Content**:
- **Podcast Content Plan**:
  - Podcast theme and core viewpoints
  - Chapter structure and key content
  - Target audience analysis
- **Search Strategy Plan**:
  - List of questions requiring deep research
  - Information sources and search keywords
  - Research depth requirements

**Important Note**:
- If Plan Mode is already complete (conversation history contains clear topic and audience), planPodcast focuses on **refining outline and research depth**, not reanalyzing the audience angle
- Research metadata (topic, kind=fastInsight, locale) is already set via `saveAnalyst` in Plan Mode

**Validation Checkpoint**:
- ✅ planPodcast tool successfully called
- ✅ Podcast content strategy and search strategy planning complete

**Implementation Details**:
```typescript
// src/app/(study)/tools/planPodcast/index.ts
const response = streamText({
  model: llm("gemini-2.5-pro"),
  tools: {
    google_search: google.tools.googleSearch({
      mode: "MODE_DYNAMIC",
      dynamicThreshold: 0, // Ensures search always occurs
    }),
  },
  system: planPodcastSystem({ locale }),
  messages: [
    {
      role: "user",
      content: planPodcastPrologue({ locale, background, question }),
    },
  ],
  onFinish: async (result) => {
    resolve({
      reasoning: result.reasoningText ?? "",
      text: result.text ?? "",
      plainText: result.text ?? "",
    });
  },
});
```

---

#### Stage 3: Deep Research

**Objective**: Execute deep research based on planPodcast's search strategy to obtain comprehensive insights

**Tools**:
- `deepResearch` (MCP tool):
  - **Capabilities**: Advanced AI model + web search + X (Twitter) search
  - **Key Parameters**:
    - `query`: Comprehensive research query constructed based on planPodcast planning
    - `expert`: Optional, defaults to "auto", automatically selects the most suitable expert
  - **Execution Time**: May take several minutes (deep search + AI reasoning)

**Output Content**:
- Comprehensive deep research results
- Key insights, data, trends
- Structured information organization

**Validation Checkpoint**:
- ✅ deepResearch tool successfully called
- ✅ Deep research results obtained
- ✅ Research results contain sufficient insights and information for podcast generation

---

#### Stage 4: Podcast Generation

**Objective**: Generate complete podcast script and audio

**Tools**:
- `generatePodcast`:
  - **No parameters required**: Tool automatically loads deep research results from the research process
  - **Data Sources**:
    - `analyst.topic`: Research topic
    - `analyst.studyLog`: Research log automatically generated from messages (if non-existent, automatically calls `generateAndSaveStudyLog`)
    - `analyst.kind`: Research type (fastInsight)
  - **Podcast Kind Determination**:
    ```typescript
    const podcastKind = analyst.kind === "fastInsight"
      ? PodcastKind.fastInsight
      : PodcastKind.opinionOriented;
    ```

**Output Content**:
- `podcastToken`: Token for accessing the generated podcast
- Podcast script (stored in `AnalystPodcast.script`)
- Podcast audio (TTS generated, stored in `AnalystPodcast.extra.audioObjectUrl`)

**Validation Checkpoint**:
- ✅ generatePodcast tool successfully called
- ✅ Podcast generation complete (including script and audio)
- ✅ podcastToken obtained for accessing podcast

**Implementation Details**:
```typescript
// src/app/(study)/tools/generatePodcast/index.ts
// Generate studyLog first if not already generated
if (!analyst.studyLog) {
  const { studyLog } = await generateAndSaveStudyLog({
    analyst,
    messages,
    locale,
    abortSignal,
    statReport,
    logger,
  });
  analyst = { ...analyst, studyLog };
}

// Determine podcast kind based on analyst kind
const podcastKind = analyst.kind === "fastInsight"
  ? PodcastKind.fastInsight
  : PodcastKind.opinionOriented;

// Generate podcast
const analystPodcast = await generatePodcast({
  userId: analyst.userId,
  analystId: analyst.id,
  topic: analyst.topic ?? analyst.brief,
  researchContext: analyst.studyLog,
  podcastKind: {
    kind: podcastKind,
    reason: analyst.kind === "fastInsight"
      ? "Fast insight study - using fastInsight podcast type"
      : "Fixed to opinionOriented for study",
  },
  // ...
});
```

---

#### Stage 5 (Optional): Report Generation

**Objective**: If user explicitly needs more in-depth structured analysis, generate high-density research report

**Tools**:
- `generateReport` (optional):
  - **When to Use**: Only when user explicitly requests or requires more in-depth structured analysis
  - **Key Parameter**: `instruction: "Generate high-density quick-read report"`
  - **Report Style**: fastInsight style (emphasizes information density and quick reading, not deep aesthetic design)

**Output Content**:
- `reportToken`: Token for accessing the generated report
- Structured research report (Markdown format)

**Notes**:
- Report generation is **optional**, not a required step
- Only use when user explicitly needs more detailed written analysis
- Report supplements podcast content, providing denser information presentation

---

#### Stage 6: Research Complete

**Tasks**:
- Concisely inform user that research is complete
- Provide `podcastToken`, guiding user to access the generated podcast content
- **Avoid** providing detailed descriptions of research conclusions (guide user to listen to podcast for complete content)

**Proactive User Guidance**:
- Encourage user to listen to the generated podcast and provide feedback
- If user wants more in-depth structured analysis, can use `generateReport` tool
- If user has new research needs, kindly explain that a new research session is required
- If user has modification requests for podcast or report content, can regenerate accordingly

**Tool Restrictions** (prevent unnecessary additional operations):
```typescript
// src/app/(study)/agents/configs/fastInsightAgentConfig.ts
customPrepareStep: async ({ messages }) => {
  const toolUseCount = calculateToolUsage(messages);

  // After report/podcast generation, only allow specific tools
  if (
    (toolUseCount[StudyToolName.generateReport] ?? 0) > 0 ||
    (toolUseCount[StudyToolName.generatePodcast] ?? 0) > 0
  ) {
    activeTools = [
      StudyToolName.generateReport,
      StudyToolName.generatePodcast,
      StudyToolName.toolCallError,
    ];
  }

  return { messages, activeTools };
}
```

---

### II. Technical Architecture

#### 1. Agent Configuration

**File Location**: `src/app/(study)/agents/configs/fastInsightAgentConfig.ts`

**Key Configuration**:
```typescript
export async function createFastInsightAgentConfig(
  params: FastInsightAgentConfigParams,
): Promise<AgentRequestConfig<TOOLS>> {
  return {
    model: "claude-sonnet-4-5",           // Main model
    systemPrompt: fastInsightSystem({ locale }),
    tools: buildFastInsightTools(params), // 7 curated tools
    maxSteps: 10,                         // Fast execution

    specialHandlers: {
      customPrepareStep: async ({ messages }) => {
        // Dynamic tool control:
        // 1. Limit webSearch usage (max 3 times)
        // 2. Restrict available tools after report/podcast generation
      },
    },
  };
}
```

**7 Curated Tools**:
```typescript
function buildFastInsightTools(params) {
  return {
    [StudyToolName.webFetch]: webFetchTool({ locale }),
    [StudyToolName.webSearch]: webSearchTool({ provider: "perplexity" }),
    [StudyToolName.planPodcast]: planPodcastTool({ studyUserChatId }),
    [StudyToolName.generatePodcast]: generatePodcastTool({ studyUserChatId }),
    [StudyToolName.generateReport]: generateReportTool({ studyUserChatId }),
    [StudyToolName.deepResearch]: deepResearchTool({ userId }),
    [StudyToolName.toolCallError]: toolCallError,
  };
}
```

---

#### 2. System Prompt

**File Location**: `src/app/(study)/prompt/fastInsight.ts`

**Core Instructions**:
```markdown
<CRITICAL_INSTRUCTIONS>
1. Never skip required tools or research stages
2. Always strictly follow research workflow in specified order
3. If uncertain about any instruction, default to explicit requirements in each stage
4. The main objective of this research is to generate high-quality, in-depth, and engaging podcast content
</CRITICAL_INSTRUCTIONS>

You are atypica.AI, a current affairs and business insight agent. Your mission is to autonomously discover deep insights on current affairs and business using the latest and hottest information sources, and create podcasts that engage listeners with content depth.

<Workflow>
1. Topic Understanding and Clarification: Quickly grasp background via webSearch
2. Podcast Planning: Use planPodcast to plan podcast content strategy and search strategy
3. Deep Research: Use deepResearch to conduct deep research
4. Podcast Generation: Generate podcast script and audio based on research results
5. Optional Report Generation: If user needs, generate structured report based on research
6. Research Complete
</Workflow>

<MUST_NOT_DO>
1. Must not prematurely end research without completing all necessary tool calls
2. Must not continue research or provide additional analysis after podcast generation
3. Must not skip any required tool call steps
4. Must not pretend you can see content that wasn't searched for
5. Must not use webSearch multiple times before planPodcast
</MUST_NOT_DO>
```

---

#### 3. Data Models

**Analyst** (Research Analyst Configuration):
```typescript
{
  kind: "fastInsight",              // Research type (fixed)
  locale: "zh-CN" | "en-US",        // Content language
  brief: string,                    // User's initial question
  topic: string,                    // Topic generated from planPodcast
  studySummary: string,             // Stores deepResearch results (deprecated, replaced by studyLog)
  studyLog: string,                 // Execution log automatically generated from messages
  attachments: FileAttachment[],    // User-uploaded reference materials
}
```

**AnalystPodcast** (Podcast Storage):
```typescript
{
  token: string,                    // Access token (nanoid(10))
  analystId: number,                // Associated Analyst ID
  script: string,                   // Podcast script (Markdown format)
  extra: {
    audioObjectUrl?: string,        // TTS-generated audio file URL
  },
  generatedAt: Date,                // Generation time
}
```

**PodcastKind** (Podcast Types):
```typescript
type PodcastKind =
  | "deepDive"          // Deep dive (academic style)
  | "opinionOriented"   // Opinion-oriented (standard research)
  | "fastInsight"       // Fast insight (Fast Insight Agent exclusive) ← This
  | "debate";           // Debate style

// Fast Insight Agent always uses fastInsight type
const podcastKind = analyst.kind === "fastInsight"
  ? PodcastKind.fastInsight
  : PodcastKind.opinionOriented;
```

---

#### 4. Detailed Toolchain

##### webSearch (Perplexity)

**Purpose**: Rapidly collect background information, latest developments, key concepts

**Key Features**:
- **Provider**: Perplexity (optimized for timeliness and accuracy)
- **Usage Limit**: Max 3 times (only 1 time before planPodcast)

**Implementation**:
```typescript
[StudyToolName.webSearch]: webSearchTool({
  provider: "perplexity",
  locale,
  abortSignal,
  statReport,
  logger,
})
```

---

##### planPodcast (Gemini 2.5 Pro)

**Purpose**: Plan podcast content strategy and deep search strategy

**Key Features**:
- **Model**: Gemini 2.5 Pro (fast, high-quality, supports Google Search grounding)
- **Integrated Tools**: google_search (MODE_DYNAMIC, dynamicThreshold=0)
- **Output**: Podcast content plan + search strategy plan

**Key Parameters**:
```typescript
{
  background: string,  // Contains all background information collected by webSearch
  question: string,    // User's research question or topic
}
```

**Implementation Details**:
```typescript
// src/app/(study)/tools/planPodcast/index.ts
const response = streamText({
  model: llm("gemini-2.5-pro"),
  tools: {
    google_search: google.tools.googleSearch({
      mode: "MODE_DYNAMIC",
      dynamicThreshold: 0, // Ensures search always occurs
    }),
  },
  system: planPodcastSystem({ locale }),
  messages: [
    {
      role: "user",
      content: planPodcastPrologue({ locale, background, question }),
    },
  ],
  onFinish: async (result) => {
    const { tokens, extra } = calculateStepTokensUsage(result);
    await statReport("tokens", tokens, {
      reportedBy: "planPodcast tool",
      ...extra,
    });
    resolve({
      reasoning: result.reasoningText ?? "",
      text: result.text ?? "",
      plainText: result.text ?? "",
    });
  },
});
```

---

##### deepResearch (MCP Tool)

**Purpose**: Execute deep research using advanced AI models combined with web search and X (Twitter) search

**Key Features**:
- **Capabilities**: Multi-source information aggregation (web + social media + AI reasoning)
- **Execution Time**: May take several minutes (deep search + analysis)
- **Expert Mode**: Optional "auto" or specify expert type

**Key Parameters**:
```typescript
{
  query: string,   // Comprehensive research query based on planPodcast planning
  expert?: string, // Optional, defaults to "auto"
}
```

---

##### generatePodcast

**Purpose**: Generate complete podcast script and audio

**Key Features**:
- **No parameters required**: Automatically loads `studyLog` from research process
- **Podcast Kind**: Automatically determined based on `analyst.kind` (fastInsight → fastInsight)
- **TTS Generation**: Automatically calls TTS service to generate audio file

**Data Flow**:
```
messages → generateAndSaveStudyLog → analyst.studyLog
                                            ↓
                                     generatePodcast
                                            ↓
                        AnalystPodcast (script + audioObjectUrl)
```

**Implementation Details**:
```typescript
// src/app/(study)/tools/generatePodcast/index.ts
execute: async ({ podcastToken }, { messages }) => {
  // Get analyst
  const userChat = await prisma.userChat.findUniqueOrThrow({
    where: { id: studyUserChatId, kind: "study" },
    select: {
      analyst: {
        select: {
          id: true,
          userId: true,
          topic: true,
          brief: true,
          studyLog: true,
          kind: true,
        },
      },
    },
  });

  let analyst = userChat.analyst;

  // Generate studyLog first if not already generated
  if (!analyst.studyLog) {
    const { studyLog } = await generateAndSaveStudyLog({
      analyst,
      messages,
      locale,
      abortSignal,
      statReport,
      logger,
    });
    analyst = { ...analyst, studyLog };
  }

  // Determine podcast kind
  const podcastKind = analyst.kind === "fastInsight"
    ? PodcastKind.fastInsight
    : PodcastKind.opinionOriented;

  // Generate podcast
  const analystPodcast = await generatePodcast({
    userId: analyst.userId,
    analystId: analyst.id,
    topic: analyst.topic ?? analyst.brief,
    researchContext: analyst.studyLog,
    podcastKind: {
      kind: podcastKind,
      reason: analyst.kind === "fastInsight"
        ? "Fast insight study - using fastInsight podcast type"
        : "Fixed to opinionOriented for study",
    },
    podcastToken,
    locale,
    abortSignal,
    statReport,
    logger,
  });

  return {
    podcastToken: analystPodcast.token,
    plainText: `Podcast generated successfully with token: ${analystPodcast.token}`,
  };
}
```

---

##### generateReport (Optional)

**Purpose**: Generate high-density structured research report based on research

**Key Features**:
- **Optional Tool**: Only use when user explicitly requests
- **Report Style**: fastInsight style (high information density, quick reading)
- **Data Source**: Automatically loads research results from `studyLog`

**Key Parameters**:
```typescript
{
  instruction: string,  // Brief description of report requirements
  reportToken: string,  // Access token
}
```

---

### III. Integration with Plan Mode

Fast Insight Agent doesn't run independently but is triggered and configured through **Plan Mode** (intent clarification layer).

#### Plan Mode Decision Logic

**File Location**: `src/app/(study)/prompt/planMode.ts`

**Trigger Conditions** (any one qualifies):
```markdown
🎯 **Priority 1: Fast Insight Agent (kind=fastInsight)**
Trigger Conditions (any one qualifies):
• Explicit request for "podcast"/"audio content"/"listenable content"
• Explicit request for "fast insight"/"rapid insights"
• Time-sensitive topics (e.g., breaking news, hot events)
• User mentions "listen during commute"/"listen while doing chores" etc.

Not Applicable Scenarios:
• Requires deep user interviews or group discussions
• Requires long-term tracking observation (e.g., social media observation)
• Requires AI Personas to simulate real user behavior
```

#### Plan Mode Workflow

```
User Input
   ↓
webSearch (1-2 times, gather background)
   ↓
makeStudyPlan (display complete plan)
   ├─ locale: zh-CN | en-US | misc
   ├─ kind: fastInsight (auto-determined)
   ├─ role: Expert role (e.g., "Business Analyst")
   ├─ topic: Complete research topic
   └─ planContent: Complete research plan (Markdown)
   ↓
User Confirmation
   ↓
saveAnalyst (save research intent)
   ↓
Fast Insight Agent begins execution
```

**Key Fields**:
```typescript
// src/app/(study)/tools/makeStudyPlan/types.ts
export const makeStudyPlanInputSchema = z.object({
  locale: z.enum(["zh-CN", "en-US", "misc"]),
  kind: z.enum([
    "productRnD",    // Product R&D
    "fastInsight",   // Fast Insight (podcast-driven) ← Here
    "testing",       // A/B testing, hypothesis validation
    "insights",      // Understand behavior, discover problems
    "creation",      // Idea generation, solution design
    "planning",      // Strategic planning, framework design
    "misc"           // General research
  ]),
  role: z.string().max(100),   // Expert role
  topic: z.string(),            // Complete research topic
  planContent: z.string(),      // Complete research plan
});
```

---

## Real-World Case Studies

### Case 1: Hot Topic Analysis - "2025 Chinese New Year Consumer Trends"

**User Request**:
```
I want to understand 2025 Chinese New Year consumer trends. Can you generate a podcast for me? Focus on changes in young people's consumer behavior.
```

**Plan Mode Decision**:
- **Trigger Condition**: Explicit request for "generate a podcast"
- **kind Decision**: `fastInsight`
- **locale Decision**: `zh-CN` (Chinese content)
- **role Generation**: Business Trend Analyst
- **topic Generation**: 2025 Chinese New Year Consumer Trends: Analysis of Changes in Young People's Consumer Behavior

**Fast Insight Agent Execution**:

**Stage 1: Topic Understanding** (1 minute)
```
webSearch: "2025 Chinese New Year consumer trends young people"
→ Collected:
  • Xiaohongshu data: Reverse Spring Festival migration up 30%
  • Meituan data: New Year's Eve dinner bookings up 50% YoY
  • iResearch: Gen Z Spring Festival consumption survey
  • Tmall: New Year goods trend report
```

**Stage 2: Podcast Planning** (2 minutes)
```
planPodcast:
  background: [All information collected by webSearch]
  question: "2025 Chinese New Year Consumer Trends: Changes in Young People's Consumer Behavior"
→ Gemini 2.5 Pro Planning:
  [Podcast Structure]
  1. Opening: 2025 Spring Festival "new ways" (reverse migration, new year goods)
  2. Core trends: Three major changes in young people's consumption
     - From "going home for New Year" to "taking family on trips"
     - From "buying year goods" to "buying experiences"
     - From "keeping up with Joneses" to "self-pleasing"
  3. Data support: Xiaohongshu, Meituan, Tmall data
  4. Case stories: Post-95 Zhang's Spring Festival spending list
  5. Closing: Three insights for brands

  [Search Strategy]
  - Focus: "reverse Spring Festival migration", "new year goods", "Gen Z Spring Festival consumption"
  - Data sources: Social media (Xiaohongshu, Douyin) + e-commerce platform reports
  - Depth: Medium (cases + data + trend analysis)
```

**Stage 3: Deep Research** (3 minutes)
```
deepResearch:
  query: "2025 Spring Festival consumption trends young people reverse migration new year goods experiential consumption"
→ MCP Tool Execution:
  • Web search: iResearch, QuestMobile, CBNData reports
  • X search: #SpringFestivalConsumption #ReverseMigration topic discussions
  • AI reasoning: Summarize key insights and trends
→ Output studyLog:
  [Core Insights]
  1. Reverse Spring Festival migration becomes mainstream (30%+ young people choose)
  2. Three trends in new year goods: health, experience, personalization
  3. Consumption motivation from "keeping up" to "self-pleasing" (70% respondents)
  4. Social media drives consumption decisions (Xiaohongshu MAU up 40%)
  5. Brand opportunities: Capture "self-pleasing economy" + "experience economy"
```

**Stage 4: Podcast Generation** (2 minutes)
```
generatePodcast:
  topic: "2025 Chinese New Year Consumer Trends: Analysis of Changes in Young People's Consumer Behavior"
  researchContext: [studyLog]
  podcastKind: fastInsight
→ Generated:
  • Podcast script (6000 words, structured dialogue)
  • TTS audio (15 minutes, supports Chinese and English)
  • podcastToken: "abc123xyz"
```

**Stage 5: Research Complete**
```
AI Reply:
"✅ Podcast generation complete!

🎧 **Listen to Podcast**: [Podcast player link]

📝 **Podcast Script**: [Script view link]

⏱️ **Duration**: Approximately 15 minutes

This podcast provides in-depth analysis of young people's consumer behavior changes during 2025 Spring Festival, including:
• Core trends like reverse migration and new year goods
• Real data support from Xiaohongshu, Meituan, Tmall
• Post-95 Spring Festival consumption case stories
• Three practical insights for brands

Listen during your commute or while doing chores! If you need a more detailed data report, I can generate a structured research report for you."
```

**User Feedback**:
```
User: "Can you generate a report too? I want to see the specific data."

AI calls generateReport:
  instruction: "Generate high-density quick-read report, emphasizing data and trends"
→ Generated:
  • Report Token: "def456uvw"
  • Report Content: Markdown format, includes charts, data tables, trend analysis

AI Reply:
"✅ Research report generated!

📊 **View Report**: [Report view link]

Report includes:
• 10+ data charts
• 5 core trend analyses
• 3 real case deep dives
• Brand practical advice checklist

Report uses high-density quick-read format, can grasp core points in 5-10 minutes."
```

---

### Case 2: Business Insight - "OpenAI Latest Launch Event Analysis"

**User Request**:
```
OpenAI just held a launch event. Can you help me quickly understand the key points? Preferably in podcast format, I'm driving.
```

**Plan Mode Decision**:
- **Trigger Condition**: Explicit request for "podcast format" + scenario "driving"
- **kind Decision**: `fastInsight`
- **Timeliness**: Very strong (breaking event)
- **locale Decision**: `zh-CN`
- **role Generation**: Tech Industry Analyst

**Fast Insight Agent Execution**:

**Stages 1-3** (6 minutes):
```
webSearch → planPodcast → deepResearch
→ Information collected:
  • Official launch event recording and transcript
  • X (Twitter) hot topics and expert commentary
  • Tech media (TechCrunch, The Verge) coverage
  • Competitor analysis (Google, Anthropic recent updates)
```

**Stage 4** (2 minutes):
```
generatePodcast:
  podcastKind: fastInsight
→ Generated 15-minute podcast:
  1. Opening: OpenAI launch event's 3 major announcements
  2. Technical analysis: GPT-5's capability breakthroughs
  3. Business impact: 5 major impacts on AI industry
  4. Competitor comparison: OpenAI vs Google vs Anthropic
  5. Closing: How ordinary users and developers should respond
```

**User Experience**:
- **Generation Time**: 8 minutes (vs. standard research 20+ minutes)
- **Podcast Duration**: 15 minutes (suitable for commute scenario)
- **Content Quality**: High (deep research + multi-source verification)

---

## Capability Boundaries

### ✅ What Fast Insight Agent Can Do

**1. Rapid Time-Sensitive Topic Research**
- Breaking news analysis (e.g., launch events, earnings reports, policy releases)
- Hot trend insights (e.g., consumer trends, industry dynamics)
- Quick knowledge learning (e.g., new technology education, industry primers)

**2. Podcast-First Content Generation**
- 15-20 minute structured podcast audio
- High-quality podcast scripts (independently readable)
- Optional high-density research reports

**3. Multi-Source Information Aggregation**
- Web search (Perplexity)
- Google Search (Gemini 2.5 Pro grounding)
- X (Twitter) search (deepResearch)
- AI deep reasoning and trend analysis

**4. Rapid Execution**
- Maximum 10 steps (vs. standard research 20+ steps)
- 5-10 minutes to complete research and podcast generation
- Optimized toolchain (7 curated tools)

---

### ❌ What Fast Insight Agent Cannot Do

**1. Deep User Research (Requires Study Agent)**
- ❌ 1-on-1 in-depth interviews (interviewChat)
- ❌ Group discussions (discussionChat)
- ❌ Deep social media observation (scoutTaskChat)

**Reason**: Fast Insight Agent doesn't use AI Personas, cannot simulate real user behavior and subjective emotions.

**2. Long-Term Tracking Research**
- ❌ Multi-stage research (e.g., Scout Agent's 3 stages: observe → reason → verify)
- ❌ Continuous observation and data accumulation

**Reason**: Fast Insight Agent focuses on rapid one-time research, doesn't support multi-stage iteration.

**3. Highly Customized Research**
- ❌ Complex research framework design (e.g., JTBD, KANO, user journey maps)
- ❌ Multi-dimensional user persona construction

**Reason**: Fast Insight Agent uses a fixed 5-stage process, doesn't support custom research methods.

**4. Large-Scale Data Analysis**
- ❌ Large-scale interviews with 50-100 AI Personas
- ❌ Quantitative data analysis and statistical modeling

**Reason**: Fast Insight Agent focuses on qualitative insights and rapid content generation, doesn't support large-scale quantitative analysis.

---

### 🤔 When to Choose Fast Insight vs Study Agent?

| **Scenario** | **Recommended Agent** | **Reason** |
|---------|---------------|---------|
| Hot topic quick analysis (e.g., breaking news) | ✅ Fast Insight | Time-sensitive, podcast format facilitates rapid dissemination |
| Content marketing (e.g., industry insight podcasts) | ✅ Fast Insight | Podcast-first, 15-minute high-quality content |
| Knowledge learning (e.g., new technology education) | ✅ Fast Insight | Quickly generated, suitable for commute scenarios |
| Product decisions (e.g., feature prioritization) | ❌ Study Agent | Requires deep user interviews (interviewChat) |
| User pain point research (e.g., purchase motivation) | ❌ Study Agent | Requires group discussions (discussionChat) + AI Personas |
| Market opportunity discovery (e.g., new track exploration) | ❌ Study Agent | Requires deep social media observation (scoutTaskChat) |
| Brand positioning research (e.g., emotional mapping) | ❌ Study Agent | Requires 50+ AI Persona large-scale interviews |

**Core Decision Criteria**:
1. **Need podcast?** → Yes → Fast Insight
2. **Need deep understanding of "why"?** → Yes → Study Agent
3. **Need large-scale user samples?** → Yes → Study Agent
4. **Time-sensitive, content marketing?** → Yes → Fast Insight

---

## Best Practices

### I. Input Optimization

**1. Clear Podcast Request**

✅ **Good Input**:
```
"I want to understand 2025 AI industry trends. Can you generate a 15-minute podcast for me? Focus on LLMs, Agents, and multimodal."
```

❌ **Poor Input**:
```
"AI industry trends"
```

**Improvements**:
- Explicitly request "podcast" (triggers Fast Insight Agent)
- Specify duration (15 minutes)
- List focus areas (LLMs, Agents, multimodal)

---

**2. Provide Background and Context**

✅ **Good Input**:
```
"I'm a product manager at a SaaS company wanting to understand 2025 enterprise AI application trends. Can you generate a podcast for me? Focus on:
1. Which AI features are most popular with enterprise customers
2. Enterprise customers' willingness to pay
3. What competitors are doing

Podcast needs data support, not too vague."
```

❌ **Poor Input**:
```
"Enterprise AI application trends"
```

**Improvements**:
- Clear role (product manager)
- List specific questions (3 focus points)
- Specify content requirements (data support)

---

**3. Upload Reference Materials**

✅ **Good Input**:
```
"I've uploaded 3 industry reports (images). Can you generate a podcast based on these reports? Focus on summarizing:
1. Core viewpoints of each report
2. Common trends and contradictions
3. Implications for our company

[Attachments: McKinsey_Report.png, Gartner_Report.png, iResearch_Report.png]"
```

**Technical Support**:
- Fast Insight Agent supports file attachments (images, documents)
- Images parsed via Vision API
- Documents extract text content

---

### II. Interaction Optimization

**1. View Progress by Stage**

Fast Insight Agent displays current execution stage in real-time:

```
✅ Stage 1: Topic Understanding and Clarification
   Using webSearch to collect background information...

✅ Stage 2: Podcast Planning
   Using planPodcast to plan podcast content strategy...

🔄 Stage 3: Deep Research
   Using deepResearch for deep research (may take several minutes)...
```

**User Experience**:
- Clear progress feedback (5 stages)
- Expected time hints (e.g., "may take several minutes")
- Real-time tool call display

---

**2. Stop Research Mid-Way**

If research direction doesn't meet expectations, user can stop anytime:

```
User: "Stop research"

AI Reply:
"✅ Research stopped.

Currently completed:
• Stage 1: Topic Understanding (Complete)
• Stage 2: Podcast Planning (Complete)
• Stage 3: Deep Research (In progress, stopped)

To restart, please present new research request."
```

---

**3. Request Additional Output**

After podcast generation, user can request additional report:

```
User: "Can you generate a report too? I want to see specific data and trend charts."

AI calls generateReport:
  instruction: "Generate high-density quick-read report, include data charts and trend analysis"

AI Reply:
"✅ Research report generated!

📊 **View Report**: [Report view link]

Report includes:
• 10+ data charts
• 5 core trend analyses
• 3 real case deep dives
• Practical advice checklist

Report uses quick-read format, can grasp core points in 5-10 minutes."
```

---

### III. Output Optimization

**1. Podcast Script Structure**

Fast Insight Agent-generated podcast scripts follow a fixed structure:

```markdown
# [Podcast Title]

## Opening (1-2 minutes)
- Hook: Opening that attracts listeners (e.g., data, case, question)
- Topic Introduction: What we're discussing today
- Why it matters: Why listeners should care

## Core Content (10-12 minutes)
### Viewpoint 1: [Core Viewpoint Title]
- Data support
- Case stories
- Trend analysis

### Viewpoint 2: [Core Viewpoint Title]
- Data support
- Case stories
- Trend analysis

### Viewpoint 3: [Core Viewpoint Title]
- Data support
- Case stories
- Trend analysis

## Closing (2-3 minutes)
- Summary: 3 core points
- Practical insights: What listeners can do
- Call to Action: Guide feedback or next steps
```

**Characteristics**:
- Structured dialogue (not interview format)
- Data + cases + trend analysis
- 15-20 minute duration (suitable for commute scenarios)

---

**2. Podcast Audio Quality**

Fast Insight Agent uses high-quality TTS service to generate audio:

**Technical Specifications**:
- **Sample Rate**: 24kHz
- **Format**: MP3
- **Languages**: Supports Chinese, English
- **Speed**: 1.0x (adjustable)
- **Voice**: Professional podcast host voice

**Future Improvements**:
- Support multilingual podcasts (e.g., bilingual Chinese-English)
- Support custom voices and tones
- Support chapter markers (for easy navigation)

---

**3. Optional Report Format**

If user requests report generation, Fast Insight Agent generates `fastInsight` style report:

**Report Characteristics**:
- **High Information Density**: Emphasizes data, charts, trends
- **Quick Reading**: Can grasp core points in 5-10 minutes
- **Markdown Format**: Supports export to PDF, Word
- **Supplements Podcast**: Report provides data and analysis not detailed in podcast

**Report Structure**:
```markdown
# [Research Topic]

## Executive Summary
- Core findings (3-5 points)
- Key data (3-5 metrics)
- Practical recommendations (3-5 points)

## Detailed Analysis
### Trend 1: [Trend Title]
- Data charts
- Case deep dives
- Impact analysis

### Trend 2: [Trend Title]
- Data charts
- Case deep dives
- Impact analysis

## Data Appendix
- Data tables
- Information sources
- Methodology notes
```

---

## Competitive Comparison

### Fast Insight Agent vs Listen Labs

| **Dimension** | **Fast Insight Agent** | **Listen Labs** |
|---------|------------------------|-----------------|
| **Primary Output** | Podcast audio + script + optional report | Interview audio + transcripts |
| **Research Method** | deepResearch (multi-source aggregation) | 1-on-1 interviews (AI Personas) |
| **Execution Speed** | 5-10 minutes | Requires manual interview design |
| **AI Personas** | Not used | User-built Personas |
| **Content Quality** | High (multi-source verification + AI reasoning) | Depends on Persona quality |
| **Use Cases** | Current affairs analysis, industry insights, content marketing | User pain point research, product decisions |
| **Podcast Type** | Structured dialogue (opinion-oriented) | Interview dialogue (Q&A format) |

**Core Difference**:
- **Fast Insight**: **Podcast-first**, rapidly generates high-quality content, suitable for current affairs and industry insights
- **Listen Labs**: **Interview-first**, deep user understanding, suitable for product and user research

---

### Fast Insight Agent vs NotebookLM

| **Dimension** | **Fast Insight Agent** | **NotebookLM** |
|---------|------------------------|---------------|
| **Primary Output** | Podcast audio + script + optional report | Podcast audio (dual dialogue) |
| **Research Capability** | ✅ Autonomous research (webSearch + deepResearch) | ❌ Only user-uploaded files |
| **Data Sources** | Web + social media + file attachments | Only user-uploaded files |
| **Podcast Type** | Structured dialogue (opinion-oriented) | Dual interview dialogue |
| **Customizability** | High (can specify focus, audience) | Low (auto-generated, cannot intervene) |
| **Report Generation** | ✅ Supported (optional) | ❌ Not supported |
| **Use Cases** | Current affairs analysis, industry insights, quick learning | File summaries, knowledge organization |

**Core Difference**:
- **Fast Insight**: **Autonomous research**, proactively collects latest information, suitable for time-sensitive topics
- **NotebookLM**: **Passive summarization**, only based on user-provided files, suitable for knowledge organization

---

### Fast Insight Agent vs Perplexity

| **Dimension** | **Fast Insight Agent** | **Perplexity** |
|---------|------------------------|---------------|
| **Primary Output** | Podcast audio + script + optional report | Text answers + cited sources |
| **Content Format** | Audio (15-20 minutes) | Text (1000-2000 words) |
| **Research Depth** | Deep (multi-source aggregation + AI reasoning + podcast planning) | Medium (search + simple summarization) |
| **Use Cases** | Learning during commute, exercise, chores | Quick information lookup |
| **Interaction Method** | Single research (5-10 minutes to generate podcast) | Multi-turn conversation (instant answers) |
| **Report Generation** | ✅ Supported (high density) | ❌ Not supported |

**Core Difference**:
- **Fast Insight**: **Podcast-first**, 15-20 minute structured audio, suitable for deep learning
- **Perplexity**: **Text-first**, instant answers, suitable for quick information lookup

---

## FAQ

### 1. What's the difference between Fast Insight Agent and Study Agent?

**Core Differences**:
- **Fast Insight**: Podcast-driven, rapidly generates audio content (5-10 minutes)
- **Study Agent**: Report-driven, deep business research (15-30 minutes)

**Detailed Comparison**:

| **Dimension** | **Fast Insight** | **Study Agent** |
|---------|------------------|-----------------|
| **Primary Output** | Podcast audio + script | Research reports |
| **Research Methods** | deepResearch (multi-source aggregation) | interviewChat + discussionChat + scoutTaskChat |
| **AI Personas** | Not used | Extensively used (Tier 1-3) |
| **Max Steps** | 10 steps | 20+ steps |
| **Tool Count** | 7 | 20+ |
| **Use Cases** | Current affairs analysis, content marketing | Product decisions, user research |

**Selection Advice**:
- **Need podcast?** → Yes → Fast Insight
- **Need deep understanding of "why"?** → Yes → Study Agent

---

### 2. What languages does Fast Insight Agent support?

**Podcast Generation**:
- ✅ Chinese (zh-CN)
- ✅ English (en-US)
- ❌ Other languages (future support)

**Content Research**:
- ✅ Supports global information sources (via webSearch + deepResearch)
- ✅ Automatically translates and integrates multilingual content

**Future Plans**:
- Support bilingual Chinese-English podcasts (e.g., Chinese podcast + English summary)
- Support more languages (Japanese, Korean, Spanish, etc.)

---

### 3. What's the podcast audio quality like?

**Technical Specifications**:
- **TTS Service**: High-quality voice synthesis
- **Sample Rate**: 24kHz
- **Format**: MP3
- **Voice**: Professional podcast host voice
- **Speed**: 1.0x (adjustable)

**User Feedback**:
- ✅ Natural, smooth voice (85%+ user satisfaction)
- ✅ Accurate Chinese pronunciation (supports polyphones, modal particles)
- ⚠️ English pronunciation slightly mechanical (future improvement)

**Future Improvements**:
- Support custom voices (e.g., male, female, different styles)
- Support emotion control (e.g., excited, serious, relaxed)
- Support multi-person dialogue (e.g., dual-host podcasts)

---

### 4. How long can podcasts be?

**Default Duration**: 15-20 minutes

**Duration Control**:
- User can specify duration in request (e.g., "generate a 10-minute podcast")
- AI automatically adjusts duration based on research depth

**Duration Limits**:
- **Minimum**: 10 minutes (too short lacks depth)
- **Maximum**: 30 minutes (too long exceeds maxSteps limit)

**Future Support**:
- Podcast series generation (e.g., 3 episodes, 15 minutes each)
- Chapter markers (for easy navigation to interesting sections)

---

### 5. What's the difference between podcast and report?

**Podcast** (Primary Output):
- **Format**: Audio + script
- **Duration**: 15-20 minutes
- **Style**: Structured dialogue (opinion-oriented)
- **Use Cases**: Learning during commute, exercise, chores

**Report** (Optional Output):
- **Format**: Markdown document
- **Length**: 5000-8000 words
- **Style**: High information density (data + charts + trend analysis)
- **Use Cases**: When detailed data and deep analysis needed

**Complementary Relationship**:
- Podcast: Quickly grasp core viewpoints and trends
- Report: Deep dive into data and case details

---

### 6. Can podcasts be regenerated?

**Regeneration Supported**:

User can request podcast regeneration. AI will:
1. Retain original research results (studyLog)
2. Recall `generatePodcast` tool
3. Generate new `podcastToken` and audio

**Scenario Example**:
```
User: "Can you regenerate the podcast? This time focus more on the data sections."

AI calls generatePodcast:
  instruction: "Emphasize data and trend charts"

AI Reply:
"✅ New podcast generated!

🎧 **Listen to New Podcast**: [New podcast player link]

This podcast is more focused on data and trend analysis, including:
• 10+ core data points
• 5 trend chart interpretations
• Insights behind the data

Original podcast still available: [Original podcast link]"
```

---

### 7. What's the cost of Fast Insight Agent?

**Token Consumption** (per research):

| **Stage** | **Tool** | **Token Consumption** |
|---------|---------|--------------|
| Topic Understanding | webSearch | ~2K tokens |
| Podcast Planning | planPodcast | ~5K tokens |
| Deep Research | deepResearch | ~15K tokens |
| Podcast Generation | generatePodcast | ~20K tokens |
| **Total** | - | **~42K tokens** |

**Optional Report**:
- generateReport: ~10K tokens

**Total Cost Estimate**:
- Podcast generation: ~42K tokens (approximately $0.20 USD)
- Podcast + report: ~52K tokens (approximately $0.25 USD)

**vs. Standard Research**:
- Study Agent (with interviews): ~150K tokens (approximately $0.75 USD)

**Cost Advantage**:
- Fast Insight Agent is 70%+ cheaper than Study Agent
- Suitable for high-frequency content generation (e.g., daily podcasts)

---

### 8. How to trigger Fast Insight Agent?

**Trigger Conditions** (any one qualifies):
1. Explicit request for "podcast"/"audio content"/"listenable content"
2. Explicit request for "fast insight"/"rapid insights"
3. Time-sensitive topics (e.g., breaking news, hot events)
4. User mentions "listen during commute"/"listen while doing chores" etc.

**Example Inputs**:
```
✅ "I want to understand 2025 AI trends. Can you generate a podcast for me?"
✅ "Can you give me fast insights on OpenAI's launch event? I'm driving."
✅ "Help me analyze this hot topic, preferably in audio format."
```

**Non-Trigger Conditions**:
```
❌ "I want to understand why users choose this product" (requires deep interviews → Study Agent)
❌ "Help me analyze market opportunities for this product" (requires multi-stage research → Study Agent)
```

---

## Summary

Fast Insight Agent is atypica.AI's **podcast-driven rapid insight research agent**, focused on transforming current affairs and business insights into high-quality audio content.

### Core Advantages

**1. Speed Meets Quality**
- 5-10 minutes to complete research and podcast generation
- Multi-source information aggregation (web + social media + AI reasoning)
- 15-20 minute structured podcast audio

**2. Strict Workflow, Quality Guaranteed**
- 5-stage linear process (Topic Understanding → Podcast Planning → Deep Research → Podcast Generation → Research Complete)
- Clear validation checkpoints at each stage
- AI cannot skip any required steps

**3. Podcast-First, Reports Optional**
- Primary output: Podcast audio + script
- Optional output: High-density quick-read reports
- Suitable for learning during commute, exercise, chores

**4. Cost Advantage**
- 70%+ cheaper than Study Agent (~42K tokens vs. ~150K tokens)
- Suitable for high-frequency content generation (e.g., daily podcasts)

### Suitable Scenarios

✅ **Suitable**:
- Hot topic quick analysis (e.g., breaking news, earnings releases)
- Industry insight podcasts (e.g., consumer trends, technology trends)
- Quick knowledge learning (e.g., new technology education, industry primers)
- Content marketing (e.g., company blogs, KOL collaborations)

❌ **Not Suitable**:
- Product decision research (requires deep user interviews)
- User pain point research (requires AI Persona simulation)
- Market opportunity discovery (requires deep social media observation)
- Brand positioning research (requires large-scale samples)

### Relationship with Other Agents

**Three-Tier Architecture**:
```
Plan Mode (Intent Clarification Layer)
    ↓
┌───────────────┬────────────────┬──────────────────┐
│ Fast Insight  │  Study Agent   │ Product R&D Agent│
│ (Podcast)     │  (Report)      │  (Product)       │
└───────────────┴────────────────┴──────────────────┘
         ↓
    Execution Layer (5-6 stage strict process)
```

**Selection Logic**:
1. **Need podcast?** → Yes → Fast Insight Agent
2. **Need deep understanding of "why"?** → Yes → Study Agent
3. **Need product innovation opportunities?** → Yes → Product R&D Agent

### Future Outlook

**Near-Term Improvements** (within 3 months):
- Support bilingual Chinese-English podcasts
- Support custom voices and tones
- Support chapter markers (for easy navigation)

**Mid-Term Improvements** (within 6 months):
- Support podcast series generation (multi-episode podcasts)
- Support multi-person dialogue podcasts (e.g., dual-host interviews)
- Enhanced audio quality and naturalness

**Long-Term Vision** (within 12 months):
- Support video podcast generation (audio + animation)
- Support real-time podcast generation (e.g., live scenarios)
- Support multilingual podcasts (Japanese, Korean, Spanish, etc.)

---

**Related Documentation**:
- [Plan Mode Value Explanation](./plan-mode.md) - Learn how to trigger Fast Insight Agent
- [Memory System Mechanism](./memory-system.md) - Learn how AI remembers your preferences
- [atypica vs Listen Labs](../competitors/atypica-vs-listen-labs.md) - Competitive comparison
- [atypica vs Traditional Research Agencies](../competitors/atypica-vs-traditional-research.md) - Industry comparison
