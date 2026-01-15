# Interview vs Discussion: Which One Should You Use?

This document provides an objective comparison of Interview Chat and Discussion Chat, two core research tools in atypica.AI, covering their differences, use cases, and capabilities.

---

## Core Differences

| Dimension | Interview Chat (In-Depth Interview) | Discussion Chat (Group Discussion) |
|------|--------------------------|--------------------------|
| **Objective** | Understand individual "why" behind motivations | Observe opinion clashes and consensus formation |
| **Participant Count** | 5-10 people (parallel 1-on-1 interviews) | 3-8 people (group simultaneous interaction) |
| **AI Role** | Consulting advisor with deep probing | Moderator facilitating discussion |
| **Conversation Structure** | Single-threaded: interviewer ↔ interviewee | Multi-agent parallel: interviewees interact |
| **Probing Method** | "5 Whys" technique, layer by layer | Guide opposing views to clash: "Why do you disagree?" |
| **Output Content** | Individual deep insights + verbatim quotes | Multi-perspective comparison + conflict points + consensus areas |
| **Duration Control** | 7 rounds per person (~10-15 minutes) | Flexible until opinions fully clash |
| **Completion Signal** | AI calls `saveInterviewConclusion` | Discussion naturally ends with summary |
| **Tracking Method** | Individual `analystInterviewId` per interview | Unified `timelineToken` tracks entire process |

---

## Use Case Comparison

### Interview Chat is Best For

✅ **Exploratory Research**
- When you don't know the answer and need to dig into "why"
- Example: Why do users abandon your product? Why choose competitors?

✅ **Deep Motivation Understanding**
- Need to understand the psychology behind decisions
- Example: Why are working women both interested in and skeptical of "zero sugar" claims?

✅ **Individual Difference Analysis**
- Need to understand specific needs across different users
- Example: How acceptance of new features varies by age group

✅ **Behavior Pattern Recognition**
- Need to identify user behavior logic in specific scenarios
- Example: In what situations do users consume energy drinks?

✅ **Decision Factor Discovery**
- Need to understand key elements influencing purchase decisions
- Example: Why does the $18-22 price range make users "hesitant"?

### Discussion Chat is Best For

✅ **Comparative Validation**
- Need to compare real reactions to different options
- Example: Subscription vs one-time purchase—which is more popular?

✅ **Opinion Collision**
- Need to observe opinion conflicts across user groups
- Example: Price-sensitive users vs power users on pricing

✅ **Consensus Discovery**
- Need to find common ground among the majority
- Example: Consensus on product core value across different backgrounds

✅ **Group Dynamics Observation**
- Need to watch how opinions evolve during discussion
- Example: Did anyone change their initial stance during the conversation?

✅ **Controversy Identification**
- Need to quickly pinpoint the most contentious issues
- Example: Among multiple product features, which is most controversial?

---

## Technical Implementation Differences

### Interview Chat Technical Implementation

**Conversation Mode**:
- Single-threaded: interviewer ↔ interviewee
- Parallel execution: simultaneous independent interviews with 5-10 interviewees
- Message conversion: interviewer's assistant messages become interviewee's user messages

**Core Tools**:
- `reasoningThinking`: Deep analysis and reasoning
- `saveInterviewConclusion`: Save interview summary (auto-triggered)
- `googleSearch` (interviewee): Supplementary information retrieval

**Interview Control**:
- Message limit: 14 messages (total for both parties)
- Timeout: 10 minutes
- Forced termination: Force call `saveInterviewConclusion` when message limit reached

**Data Persistence**:
```typescript
analystInterview {
  id: analystInterviewId
  analystId: Research ID
  personaId: Interviewee ID
  instruction: Interview requirements
  conclusion: Interview summary (markdown format)
  interviewUserChatId: Conversation record ID
}
```

**Model Selection**:
- Interviewer: Claude 3.7 Sonnet / Gemini 2.5 Flash
- Interviewee: Gemini 2.5 Flash (with Google Search grounding support)

### Discussion Chat Technical Implementation

**Conversation Mode**:
- Multi-agent parallel: moderator + 3-8 interviewees
- Group interaction: interviewees observe each other's statements
- Turn control: moderator decides speaking order and discussion pace

**Discussion Types** (3 presets):
1. **Default (Focus Group)**: Consensus building, finding common ground
2. **Debate**: Debate mode, emphasizing opposing views
3. **Roundtable**: Equal exchange and open dialogue

**Data Tracking**:
```typescript
discussionTimeline {
  token: timelineToken
  instruction: Discussion directive
  events: []  // Real-time updated discussion event stream
  summary: Discussion summary
  minutes: Meeting minutes
  extra: {}
}
```

**Real-Time Updates**:
- Frontend polls for progress using `timelineToken`
- Each statement auto-saved to `events` array
- `summary` and `minutes` generated after discussion ends

**Model Selection**:
- Moderator: Claude 3.7 Sonnet / GPT-4.1 Mini
- Interviewees: Gemini 2.5 Flash

---

## Output Content Comparison

### Interview Chat Output

**Interview Summary for Each Interviewee** (markdown format):
```markdown
## Interview Summary
[Overall impression and key findings]

## Key Findings
- Finding 1
- Finding 2
- ...

## User Profile
[Interviewee characteristics and typical behavior patterns]

## Memorable Dialogue Excerpts
> Interviewer: Why does "weird" make you hesitate?
> Linda: Because I need a "lifeline," not an "experiment."
```

**Unified Interview Summary** (all interviewees):
- Generated by GPT-4.1 Mini
- Covers main perspectives, behavior patterns, and decision factors across all participants
- Highlights important findings and patterns

### Discussion Chat Output

**Discussion Summary** (summary):
- Core viewpoint aggregation
- Key moments of opinion collision
- Consensus reached and unresolved controversial points

**Meeting Minutes** (minutes):
- Complete speaking order and content
- Each participant's stance evolution
- Moderator's guidance strategy

**Event Stream** (timeline events):
- Real-time recording of each statement
- Full discussion process traceable
- Supports real-time frontend display

---

## What We Can Do

### Interview Chat

✅ **AI-Facilitated Deep Interviews**
- Infinite "why" probing until reaching root motivation
- Auto-detect vague answers and actively probe for clarification
- Use professional techniques like "5 Whys," scenario simulation, comparative inquiry

✅ **Parallel Efficient Execution**
- Simultaneously conduct independent interviews with 5-10 interviewees
- Each interview independently recorded without interference
- Interview failures don't affect other ongoing interviews

✅ **Complete Conversation Traceability**
- Every conclusion traceable to specific dialogue excerpts
- Complete interview records preserved (interviewUserChatId)
- Full interview review available

✅ **Automatic Summarization and Distillation**
- AI auto-identifies key findings and user profiles
- Extracts memorable dialogue excerpts as evidence
- Generates structured interview summaries

### Discussion Chat

✅ **AI Assembles Users with Specific Stances**
- Actively select personas with different viewpoints to participate
- Ensure sufficient opinion opposition in discussions
- Customizable discussion types (Focus Group / Debate / Roundtable)

✅ **Facilitate Opinion Collision**
- Moderator identifies opinion conflicts and actively guides
- Ask "Why do you disagree?" to promote deep discussion
- Control speaking pace, ensure everyone has expression opportunities

✅ **Identify Consensus and Divergence**
- Auto-identify consensus areas within the group
- Flag most controversial issues
- Track opinion evolution during discussion

✅ **Real-Time Discussion Tracking**
- Frontend can view discussion progress in real-time
- Access event stream via `timelineToken`
- Support discussion process replay

---

## What We Cannot Do

### Technical Limitations (Physically impossible or ineffective)

#### Interview Chat

❌ **Cannot Replace All Real Human Interview Scenarios**
- **Reason**: AI personas cannot fully simulate human emotional resonance and spontaneous reactions
- **Specific Manifestations**:
  - Deep emotional insights: Brand emotional connections, lifestyle exploration require real humans
  - Non-verbal information: Body language, tone changes, hesitation pauses cannot be fully simulated
  - Complex psychological analysis: Deep psychological trauma, emotional disorders require professional therapists
- **Alternative**: Use for exploratory research and preliminary insights; high-stakes decisions need supplementary real human interviews

❌ **Cannot Adapt in Real-Time to Unexpected Situations**
- **Reason**: AI interviews follow preset processes, cannot adapt flexibly like humans
- **Specific Manifestations**:
  - If interviewee suddenly raises unexpected topics, AI may not adjust in time
  - Situations requiring on-site judgment (e.g., interviewee becoming emotional), AI lacks coping ability
- **Alternative**: Pre-design interview framework and contingency plans

#### Discussion Chat

❌ **Cannot Simulate In-Person Focus Group Atmosphere**
- **Reason**: AI persona interactions lack the "chemistry" of face-to-face human encounters
- **Specific Manifestations**:
  - Missing on-site eye contact, body language
  - Missing "bandwagon effect," "authority effect" in real human groups
  - Missing immediate emotional contagion on-site
- **Alternative**: Use Discussion to simulate opinion collision, but acknowledge missing on-site dynamics

❌ **Cannot Handle Highly Complex Group Dynamics**
- **Reason**: AI moderator's facilitation ability is limited; complex group relationships are hard to control
- **Specific Manifestations**:
  - Complex scenarios with multi-party interest conflicts (e.g., internal enterprise multi-department discussions)
  - Sensitive topics requiring professional moderation skills (e.g., politics, religion)
- **Applicable Scenarios**: Suitable for relatively simple product/service discussions, not for highly politicized or interest-complex scenarios

### Strategic Choices (Can do but deliberately don't)

#### Interview Chat

❌ **Don't Do Hybrid Interviews with Real Human Researchers**
- **Reason**: Deliberately avoid "human researcher + AI persona hybrid interviews" to maintain controllability of pure AI simulation
- **Applicable Scenarios**: If real human researcher participation needed, recommend traditional interview methods

#### Discussion Chat

❌ **Don't Do Large-Scale Group Discussions (10+ people)**
- **Reason**: Too many participants lead to:
  - AI moderator difficulty controlling discussion pace
  - Uneven speaking opportunities for participants
  - Decreased discussion efficiency, hard to reach consensus
- **Limitation**: Discussion Chat limited to 3-8 people
- **Alternative**: For large-scale research, recommend multiple Discussion group discussions, or use Interview parallel interviews

---

## Real-World Case Comparison

### Case: Sparkling Coffee New Product Testing

**Scenario Description**: A coffee brand plans to launch a "sparkling coffee" product (zero-sugar carbonated + cold brew coffee), positioned as healthy energy boost, targeting 25-35-year-old urban working women, priced at $18-22. Want to understand user acceptance and pricing strategy.

#### Using Interview Chat

**Execution Method**:
1. Conduct 1-on-1 deep interviews with 5 typical users
   - Linda (28, operations): Coffee lifeline dependent
   - Emma (32, PM): Health-anxious
   - Chloe (26, designer): Social trendsetter
   - ...

2. 7 rounds of conversation per person with deep probing:
   - "Why does 'weird' make you hesitate?"
   - "What evidence would convince you 'the extra $8 is worth it'?"
   - "If a friend recommended it, would you be more willing to try?"

**Output Results**:
- Independent interview summary per person (3000+ words)
- Memorable dialogue excerpts:
  > Linda: "At that afternoon time, I'm not in the mood to take risks."
  > Emma: "Zero sugar is good, but is the sweetener safe? I still need to check the ingredient list."

**Why Applicable**:
- Need to understand each user's deep motivation (why hesitant?)
- Need complete decision chain (psychological process from awareness to purchase)

#### Using Discussion Chat

**Execution Method**:
1. Assemble 5 users with different stances for group discussion
   - 2 price-sensitive users
   - 2 health-anxious users
   - 1 social trendsetter user

2. Moderator guides discussion:
   - "What do you think of the $18-22 price range?"
   - Observe: Price-sensitive vs trendsetter opinion collision
   - Follow-up: "Why is there such a big difference in your views on pricing?"

**Output Results**:
- Discussion summary:
  - Consensus: Zero-sugar concept attractive, but sweetener doubts widespread
  - Divergence: Price acceptance varies greatly depending on user type
  - Key controversy: Is "sparkling + coffee" innovation or gimmick?

**Why Applicable**:
- Need to quickly compare reactions across different user groups
- Need to observe opinion collision and evolution in discussion

#### Comparison Summary

| Dimension | Interview Chat | Discussion Chat |
|------|---------------|----------------|
| **Depth** | ★★★★★ (Very deep per user) | ★★★☆☆ (Breadth over depth) |
| **Breadth** | ★★★☆☆ (5 independent perspectives) | ★★★★☆ (Richer opinion comparison) |
| **Consensus Discovery** | ★★★☆☆ (Requires manual integration) | ★★★★★ (Auto-identifies consensus) |
| **Divergence Identification** | ★★★☆☆ (Requires manual comparison) | ★★★★★ (Auto-flags controversy) |
| **Execution Time** | ~50-70 minutes (5 parallel) | ~30-40 minutes (group discussion) |

**Recommended Strategy**:
- **Early Exploration**: Start with Interview to deeply dig into individual motivations
- **Comparative Validation**: Then use Discussion to observe opinion collision and consensus

---

## When to Combine Both

### Best Practice: Interview First, Then Discussion

**Applicable Scenarios**:
- Complex product decisions (multiple dimensions to consider)
- Need deep understanding + quick validation
- Budget and time both allow

**Execution Process**:
1. **Phase 1 - Interview (Exploration Phase)**:
   - Conduct deep interviews with 5-8 users
   - Goal: Understand deep motivations and decision logic
   - Output: Individual insights and behavior patterns

2. **Phase 2 - Discussion (Validation Phase)**:
   - Based on key controversies found in Interviews
   - Assemble users with different stances for group discussion
   - Goal: Validate consensus, identify divergence
   - Output: Group consensus and controversy checklist

**Advantages**:
- Interview provides depth, Discussion provides breadth
- Understand individuals first, then observe groups
- More comprehensive insights, more reliable conclusions

---

## Technical Details Quick Reference

### Code Implementation Locations

- **Interview Chat**:
  - Tool definition: `src/app/(study)/tools/interviewChat/index.ts`
  - Prompt: `src/app/(study)/tools/interviewChat/prompt.ts`
  - Interview summary save: `src/app/(study)/tools/interviewChat/saveInterviewConclusion/index.ts`

- **Discussion Chat**:
  - Tool definition: `src/app/(study)/tools/discussionChat/index.ts`
  - Discussion types: `src/app/(panel)/discussionTypes/index.ts`
  - Execution logic: `src/app/(panel)/lib/index.ts`

### Key Parameters

**Interview Chat**:
```typescript
{
  personas: { id: number, name: string }[]  // 5-10 people
  instruction: string  // Interview requirements
}
```

**Discussion Chat**:
```typescript
{
  instruction: string  // Discussion directive
  personaIds: number[]  // 3-8 people
  timelineToken: string  // Auto-generated for tracking
}
```

---

## Frequently Asked Questions

### Q1: Can Interview and Discussion use the same batch of users?

**Yes**. Both can target the same batch of AI personas, but will produce different insights:
- Interview: Understand each person's deep motivations
- Discussion: Observe opinion collision among these people

### Q2: Is the "7 rounds of conversation" limit for Interview too short?

**Design Rationale**:
- 7 rounds (14 messages total for both parties) is about 10-15 minutes
- Beyond this length, interviewees may fatigue, information quality declines
- If deeper dive needed, can re-initiate Interview with specific users after report generation

### Q3: How does Discussion ensure users with different stances all participate?

**Moderator Strategy**:
- AI moderator actively calls on people to speak
- Identifies "silent ones" and invites expression
- Controls "chatterboxes" to ensure balanced participation

### Q4: How is the quality of Interview-generated summaries?

**Quality Assurance**:
- Unified summary generated by GPT-4.1 Mini
- Based on all interview conclusions (markdown format)
- Highlights important findings and patterns with structured presentation

### Q5: Is there delay in Discussion's real-time tracking?

**Delay Situation**:
- Frontend polls using `timelineToken` (refresh every ~1-2 seconds)
- Discussion events saved to database in real-time
- May have 1-3 second delay, but doesn't affect overall experience

---

## Document Version

- **Version**: v1.0
- **Last Updated**: 2026-01-15
- **Maintained by**: atypica.AI Product Team
- **Data Sources**:
  - Code implementation: `src/app/(study)/tools/interviewChat/`, `src/app/(study)/tools/discussionChat/`
  - User research journey: `docs/product/user-research-journey.md`
  - Prompt design: `src/app/(study)/tools/interviewChat/prompt.ts`
