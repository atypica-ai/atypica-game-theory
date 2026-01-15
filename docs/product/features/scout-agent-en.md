# Scout Agent: Deep Social Media Observation

This document details the core capabilities, workflow, technical implementation, and use cases of Scout Agent (User Discovery Intelligence Agent).

---

## What is Scout Agent?

Scout Agent is atypica.AI's social media observation intelligence agent that **works like an anthropologist conducting field research**, using immersive observation of social media content to understand a group's lifestyle, values, and mindset.

**Core Philosophy**:
> Not about collecting data and statistics, but **observing and understanding** the social psychology and cultural characteristics of a group.

---

## Core Differences: Scout vs Traditional Social Listening Tools

| Dimension | Scout Agent (atypica.AI) | Traditional Social Listening (Brandwatch, etc.) |
|------|-------------------------|----------------------------|
| **Objective** | Understand group social psychology and cultural traits | Monitor brand mentions and sentiment analysis |
| **Method** | Anthropologist-style field research | Data scraping and statistical analysis |
| **Focus** | "Why do they think, speak, and act this way" | "How many brand mentions, positive or negative" |
| **Output** | Social psychology analysis + AI persona building | Data reports + sentiment trend charts |
| **Data Sources** | 5 platforms (XHS, Douyin, Instagram, TikTok, Twitter) | 1M+ websites (broader but less deep) |
| **Workflow** | 3 phases (observe → reason → validate) | Continuous monitoring + real-time alerts |
| **Final Product** | AI personas usable for interviews | Brand monitoring reports |

---

## Three-Phase Workflow

### Phase 1: Immersive Observation Phase (First 5 tool calls)

**Objective**: Don't rush to conclusions, browse and watch extensively first

**AI Behavior**:
- Focus on "interesting," "resonant," "conflicting" content
- Notice linguistic subtleties: tone, word choice, expression habits
- Record recurring themes, emotions, value expressions

**Available Tools** (15 social media tools):
- **Search tools**: `xhsSearch`, `dySearch`, `tiktokSearch`, `insSearch`, `twitterSearch`
- **User content**: `xhsUserNotes`, `dyUserPosts`, `tiktokUserPosts`, `insUserPosts`, `twitterUserPosts`
- **Comment interaction**: `xhsNoteComments`, `dyPostComments`, `tiktokPostComments`, `insPostComments`, `twitterPostComments`

**Example Observation Process** (Sparkling Coffee case):
```
1st: XHS search "working women coffee energy"
- Finding: Massive "3pm lifeline coffee" content
- Language: Users often say "lifeline," "emergency," "wake up"
- Emotion: Repeated mentions of "sugar anxiety"

2nd: XHS search "zero sugar drinks healthy"
- Finding: Users highly sensitive to "zero sugar" concept
- Tone: Both "seeking comfort" and "self-doubt"
- Keywords: "Are sweeteners safe," "Really zero calories"

3rd: Douyin search "sparkling water coffee"
- Finding: Curiosity about sparkling + coffee combo
- Comments: "Will it taste weird," "Want to try but afraid to waste"
- Note: Aesthetics and social posting frequently appear

4th: Instagram search "sparkling coffee"
- Finding: Similar foreign products emphasize "energizing"
- Visual: Lean toward "refreshing," "vibrant"
- Difference: Users focus on "taste" more than "health"

5th: XHS search "convenience store new coffee"
- Finding: Strong willingness to try new, but price-sensitive
- Price: $18-22 is a "hesitation zone"
- Repurchase: Depends on "taste" rather than concept
```

### Phase 2: Deep Understanding Phase (After 5th call, forced trigger)

**Trigger Mechanism**:
- Code implementation: When tool call count >= 5 and `reasoningThinking` not used, force call
- Model switch: Temporarily switch to `gemini-2.5-pro` for reasoning

**reasoningThinking tool call**:

```typescript
{
  background: "Observation summary (brief overview of phenomena)",
  question: "Social psychology question requiring deep understanding"
}
```

**Example Reasoning Process**:

**Input**:
```
background: "Observed ~40 XHS and Douyin posts. Working women (25-35) discussing coffee and energy drinks repeatedly use 'lifeline,' 'emergency,' 'wake up,' with both self-mockery and anxiety in tone. They're highly focused on but skeptical of 'zero sugar' concept ('Are sweeteners safe'). Show curiosity about sparkling + coffee combo but worry about 'wasting money.' Price $18-22 seen as 'a bit expensive but worth trying' hesitation zone."

question: "These people repeatedly use 'lifeline' and 'emergency' to express afternoon energy needs while being skeptical and anxious about 'zero sugar.' What value conflicts does this reflect? Why do they want to try new things yet fear 'wasting money'? How does this contradictory psychology affect their purchase decisions for $18-22 new products?"
```

**Output** (AI reasoning result):
```markdown
## Social Psychology Analysis

### 1. Identity Anxiety vs Self-Management Conflict
- "Lifeline" reflects helplessness under workplace pressure
- "Zero sugar" anxiety stems from compulsive need for body management
- They try to regain control through "healthy choices"

### 2. Innovation Desire vs Risk Aversion Balance
- Curiosity drives experimentation, but "fear of waste" reflects consumer rationalization
- $18-22 isn't "can't afford," but "is it worth it" judgment
- Need "reasons" to convince themselves: aesthetics, social posting, friend recommendations

### 3. Group Identity vs Individual Expression Tension
- "Showing off" on social media seeks recognition
- But they resist being "marketed to" or "paying IQ tax" labels
- Products need balance between "trendy" and "practical"
```

### Phase 3: Continue Observation Validation (6th-15th tool calls)

**Objective**: With reasoning insights, continue observing more details

**AI Behavior**:
- Validate or revise previous understanding
- Focus on contradictory, unexpected, complex manifestations
- Further refine user profiles

**Stop Conditions**:
- Tool call count reaches 15-17 times
- Token consumption exceeds 150,000
- Force output summary (after 15th time, AI asked to describe understood group)

---

## Observation Dimension Framework

Scout Agent follows these observation dimensions (not data dimensions):

### 1. Lifestyle Observation
- How do they describe their daily lives? What tone do they use?
- What value pursuits do their shared life moments reveal?
- What aesthetics and tastes do their expressions reflect?
- In what contexts do they express joy, anxiety, anticipation?

### 2. Social Interaction Observation
- How do they interact with others on social media? Tone intimate, distant, or specific style?
- How do they respond to different viewpoints? Inclusive, confrontational, or avoidant?
- How do they express resonance in comments? What discourse style?
- How do they define "us" and "them"? Where are group boundaries?

### 3. Values and Identity Observation
- What value ordering do they reveal in consumption decisions?
- How do they balance ideal vs reality conflicts?
- What content triggers their strong emotional resonance?
- What identity labels do they embrace? What labels do they resist?

### 4. Expression and Language Observation
- What vocabulary and sentence patterns do they habitually use?
- Are their expressions direct, euphemistic, or specific rhetorical style?
- How do they use slang, memes, emoji?
- How does their language style change across different contexts?

---

## Technical Implementation Details

### Model Selection Strategy

| Phase | Model | Reason |
|------|------|------|
| **Observation Phase** | Gemini 2.5 Flash | Low cost, fast speed, supports Google Search grounding |
| **Reasoning Phase** | Gemini 2.5 Pro | Strong reasoning ability, supports thinkingConfig (includeThoughts) |
| **Forced Summary** | Gemini 2.5 Pro | High generation quality, can integrate multi-round observations |

### Tool Call Control (prepareStep mechanism)

```typescript
prepareStep: async ({ messages }) => {
  const toolUses = count already called tools;

  // Rule 1: After 15+2 times, force output summary
  if (toolUses.length >= 17) {
    return {
      model: llm("gemini-2.5-pro"),
      toolChoice: "none",  // Disable tools
      activeTools: [],
      messages: [...messages, {
        role: "user",
        content: "Observation sufficient, please describe the group you understand."
      }]
    };
  }

  // Rule 2: After 5th time, force call reasoningThinking
  if (toolUses.length >= 5 && reasoningThinking not used) {
    return {
      model: llm("gemini-2.5-pro"),
      toolChoice: "required",
      activeTools: [StudyToolName.reasoningThinking]
    };
  }

  // Rule 3: Normal observation phase, exclude reasoningThinking
  return {
    activeTools: social media tool list (without reasoningThinking)
  };
}
```

### Token Consumption Control

```typescript
reduceTokens: { model: "gemini-2.5-flash", ratio: 10 }

stopWhen: async ({ steps }) => {
  // Condition 1: Token consumption exceeds 150k
  if (tokensConsumed > 150_000) {
    logger.error(`Token consumption exceeded, ending observation`);
    return true;
  }

  // Condition 2: Tool call count reaches 20 times
  return steps.length >= 20 ||
         steps.reduce((acc, step) => acc + step.toolCalls.length, 0) >= 20;
}
```

### Data Persistence

```typescript
userChat {
  id: scoutUserChatId
  kind: "scout"  // Or "misc" (if not dedicated scout task)
  token: scoutUserChatToken  // Unique identifier
  title: observation task description (truncated to 100 chars)
  backgroundToken: background run identifier
}

// Each observation record saved as chatMessage
chatMessage {
  userChatId: scoutUserChatId
  role: "assistant"
  parts: [
    { type: "text", text: "Observation content" },
    { type: "tool-call", toolName: "xhsSearch", ... },
    { type: "tool-result", toolName: "xhsSearch", ... }
  ]
}
```

### Platform Coverage Statistics

```typescript
stats: {
  "小红书": 3,  // Called XHS tools 3 times
  "抖音": 2,
  "Instagram": 1,
  "Twitter": 2,
  // TikTok: 0 (not called)
}
```

---

## What We Can Do

### ✅ Immersive Social Media Observation

**Capability Description**:
- Simultaneously covers 5 mainstream social platforms
- Not simple keyword searches, but understanding context and emotion
- Identifies linguistic subtleties: tone, word choice, expression habits

**Technical Support**:
- 15 social media tools (search, user content, comment interaction)
- Google Search grounding (Gemini 2.5 Flash built-in)
- Auto-record platform coverage (stats statistics)

**Example**:
> When searching "working women coffee," not just finding "coffee" keyword, but understanding "lifeline coffee," "3pm emergency" behind workplace anxiety and identity.

### ✅ Deep Social Psychology Analysis

**Capability Description**:
- Force reasoningThinking after 5th observation
- Not statistical frequency, but understanding "why" and "how"
- Elevate observed phenomena to value, identity, cultural symbol levels

**Technical Support**:
- reasoningThinking tool (Gemini 2.5 Pro)
- Supports thinkingConfig (includeThoughts: true)
- 5-10 minutes deep reasoning time

**Output Quality**:
- Distill value conflicts (e.g., "identity anxiety vs self-management")
- Identify contradictory psychology (e.g., "innovation desire vs risk aversion")
- Reveal group identity mechanisms (e.g., "social posting vs resisting marketing")

### ✅ Intelligent Platform Selection

**Capability Description**:
- AI auto-judges global issues vs localized issues
- Dynamically selects search platform combinations

**Strategy**:
```
Global issues (e.g., "Gen Z attitude toward metaverse"):
- Chinese context: XHS + Douyin + Instagram + Twitter
- English context: Twitter + Instagram + TikTok + XHS

Localized issues (e.g., "Beijing working women coffee habits"):
- Chinese context: Only XHS + Douyin
- English context: Only Twitter + Instagram + TikTok
```

### ✅ Build AI Personas Usable for Interviews

**Capability Description**:
- Based on observation results, build typical user AI personas (Tier 1)
- Personas include social psychology analysis and behavior patterns
- Can be directly used for subsequent Interview or Discussion

**Data Sources**:
- 30-50 social media posts
- Social psychology analysis conclusions
- User profiles (7-dimension framework)

**Persona Output** (example):
```
Linda - Lifeline Coffee Dependent
- Age: 28, operations role
- Typical behavior: 3pm daily crash, high energy boost requirements
- Language style: "lifeline," "emergency," "no mood for risks"
- Value conflict: workplace pressure vs health anxiety
- Decision logic: efficacy promise > health concept, needs "worth it" reason
```

---

## What We Cannot Do

### Technical Limitations (Physically impossible or ineffective)

#### ❌ Cannot Replace Quantitative Large-Sample Social Listening

**Reason**:
- Scout observes 30-50 posts, cannot achieve statistical significance
- Does not provide precise percentages, trend charts, data reports

**Comparison**:
- **Brandwatch**: 1.6 trillion historical conversations, 1M+ websites, real-time monitoring
- **Scout Agent**: 30-50 posts deep understanding, 5 platforms, qualitative analysis

**Applicable Scenarios**:
- ✅ Scout suitable for: Understanding "why," building AI personas
- ❌ Scout not suitable for: Brand monitoring, crisis warning, sentiment trends

**Alternative**:
- For quantitative monitoring, use Brandwatch / Sprinklr tools
- Scout complements with deep understanding and persona building

#### ❌ Cannot Cover All Social Platforms

**Reason**:
- Only covers 5 mainstream platforms (XHS, Douyin, Instagram, TikTok, Twitter)
- No Facebook, LinkedIn, YouTube, Bilibili, Zhihu, etc.

**Comparison**:
- **Brandwatch**: 1M+ websites and platforms
- **Scout Agent**: 5 selected platforms (but deeper understanding)

**Applicable Scenarios**:
- ✅ Scout suitable for: Deep understanding of 5 platforms
- ❌ Scout not suitable for: Full-web sentiment monitoring

#### ❌ Cannot Real-Time Monitor and Alert

**Reason**:
- Scout is one-time observation task, not continuous monitoring
- No real-time alert mechanism (brand crisis, negative sentiment)

**Comparison**:
- **Brandwatch**: Real-time monitoring, sentiment analysis, auto-alerts
- **Scout Agent**: One-time deep observation (6-8 hours)

**Applicable Scenarios**:
- ✅ Scout suitable for: Product concept validation, user group understanding
- ❌ Scout not suitable for: Brand monitoring, crisis warning

### Strategic Choices (Can do but deliberately don't)

#### ❌ Don't Do Shallow Keyword Matching

**Reason**:
- Deliberately don't do simple statistics of "how many brand mentions"
- Focus on understanding "what kind of people this group is"

**Example**:
- ❌ Don't: "Coffee" mentioned 500 times, 70% positive sentiment
- ✅ Do: "This group uses 'lifeline' to express anxiety, 'self-care' to rationalize consumption"

#### ❌ Don't Do Historical Data Retrospection

**Reason**:
- Deliberately don't do "back to 2010" historical analysis
- Focus on current user psychology and behavior patterns

**Comparison**:
- **Brandwatch**: Historical data back to 2010
- **Scout Agent**: Current real-time search results

#### ❌ Don't Do Multi-Task Parallel Observation

**Reason**:
- Each Scout task focuses on one group or one question
- Does not support simultaneously observing multiple unrelated groups

**Alternative**:
- To observe multiple groups, launch multiple independent Scout tasks

---

## Integration with Other atypica Features

### Scout → buildPersona → Interview

**Best Practice Process**:

1. **Phase 1 - Scout Observation** (2-3 hours):
   - Observe social media, understand group characteristics
   - Output: Social psychology analysis + platform coverage stats

2. **Phase 2 - buildPersona** (automatic):
   - Based on Scout observation results
   - Build 3-5 typical AI personas (Tier 1)
   - Save to Persona library

3. **Phase 3 - Interview** (3-4 hours):
   - Use built AI personas for deep interviews
   - Validate Scout observation conclusions
   - Get more detailed decision chains

**Advantages**:
- Scout provides group profile, Interview provides individual depth
- From "understanding what kind of people" to "understanding why they decide this way"
- Traceable insight chain: social media observation → social psychology analysis → deep interview

---

## Real-World Case

### Case: Sparkling Coffee Target User Discovery

**Research Goal**:
Understand potential reactions of 25-35-year-old urban working women to "sparkling coffee" new product.

**Scout Observation Process**:

**1st-5th Observations** (immersion phase):
```
1. XHS search "working women coffee energy"
   → Finding: "3pm lifeline coffee" topic 5M+ views

2. XHS search "zero sugar drinks healthy"
   → Finding: "Sweetener anxiety" related posts 2000+

3. Douyin search "sparkling water coffee"
   → Finding: Comments "Will it taste weird," "Want to try but afraid to waste"

4. Instagram search "sparkling coffee"
   → Finding: Foreign products emphasize "energizing," users focus on taste

5. XHS search "convenience store new coffee"
   → Finding: Prices above $18 make users hesitate "is it worth it"
```

**After 5th** (reasoning phase):
```
reasoningThinking input:
"These people repeatedly use 'lifeline' and 'emergency' to express afternoon energy needs while being skeptical and anxious about 'zero sugar.' What value conflicts does this reflect?"

AI reasoning output:
1. Identity Anxiety vs Self-Management Conflict
   - "Lifeline" reflects helplessness under workplace pressure
   - "Zero sugar" anxiety stems from compulsive need for body management

2. Innovation Desire vs Risk Aversion Balance
   - Curiosity drives experimentation, but "fear of waste" reflects consumer rationalization
   - $18-22 isn't "can't afford," but "is it worth it" judgment

3. Group Identity vs Individual Expression Tension
   - "Showing off" on social media seeks recognition
   - But they resist being "marketed to" or "paying IQ tax" labels
```

**6th-12th Observations** (validation phase):
```
6. XHS search "afternoon tea check-in office"
   → Validate: Social motivation indeed exists

7. XHS search "sweetener anxiety truth"
   → Validate: Health anxiety deeper than expected

8. XHS search "coffee alternative value"
   → Validate: Price sensitivity point is "is it worth" not "can afford"

... (continue observing 4-5 times, validate or revise initial understanding)
```

**Scout Output**:

**Platform Coverage Stats**:
```json
{
  "小红书": 6,
  "抖音": 2,
  "Instagram": 1
}
```

**Built AI Personas** (3):
1. **Linda - Lifeline Coffee Dependent** (40%)
   - Core need: 3pm energy boost emergency
   - Purchase motivation: Efficacy promise (better energy)
   - Language style: "lifeline," "emergency," "no mood for risks"

2. **Emma - Health Anxious** (35%)
   - Core need: Healthy energy, reduce guilt
   - Purchase motivation: Transparent ingredients, sweetener safety
   - Language style: "Are sweeteners safe," "I still need to check ingredients"

3. **Chloe - Social Trendsetter** (25%)
   - Core need: Fresh experience, social posting
   - Purchase motivation: Aesthetics, friend recommendations
   - Language style: "If the bottle looks good, I might buy it for photos"

**Follow-up Actions**:
- Use Interview tool to conduct deep interviews with these 3 AI personas
- Test "sparkling coffee" concept acceptance and pricing strategy
- Generate final research report

---

## Frequently Asked Questions

### Q1: Is Scout observation content real-time?

**Answer**:
- **Partially real-time**: Search results based on platform's current data
- **Has delay**: Social platform APIs may have hours to days delay
- **Not historical retrospection**: Unlike Brandwatch can go back to 2010

**Recommendation**:
- For understanding current trends, Scout is timely enough
- For historical comparative analysis, recommend supplementing traditional social listening tools

### Q2: Can Scout's reasoningThinking be skipped?

**Answer**:
- **Cannot**: After 5th tool call, system forces reasoningThinking trigger
- **Design reason**: Ensure observation isn't just "looked around" but "understood"
- **Quality assurance**: Reasoning phase is key to elevating phenomena to social psychology level

### Q3: Is Scout observing 30-50 posts too few?

**Answer**:
- **Not statistical research**: Scout's goal isn't "X% of people think this way"
- **Is qualitative understanding**: 30-50 posts sufficient to identify language patterns, value conflicts, group identity
- **Comparison**: Anthropologists doing field research don't need thousands of samples either

**Quality Assurance**:
- AI persona consistency: 79 points (social media data), approaching 81% human baseline
- Sufficient to build representative AI personas for subsequent interviews

### Q4: How does Scout avoid "selection bias"?

**Answer**:
- **AI actively diversifies**: Observe different platforms, keywords, user groups
- **Explicit vs implicit expression**: Not just "I like X," also see tone, word choice, contradictory statements
- **Reasoning phase verification**: reasoningThinking identifies "did we only see some people"

**Limitation**:
- Acknowledge social media users ≠ all target users
- Recommendation: Scout for exploratory research, high-stakes decisions need supplementary real human research

### Q5: How is Scout's token consumption controlled?

**Answer**:
- **Model selection**: Observation phase uses Gemini 2.5 Flash (low cost)
- **Token limit**: Auto-stops after exceeding 150k tokens
- **Ratio optimization**: `reduceTokens: { ratio: 10 }` reduces cost

**Actual Consumption** (sparkling coffee case):
- 12 tool calls: ~80,000 tokens
- Cost: ~$1-2 (far below traditional research $50k-100k)

---

## Technical Details Quick Reference

### Code Implementation Locations

- **Tool definition**: `src/app/(study)/tools/scoutTaskChat/index.ts`
- **Type definition**: `src/app/(study)/tools/scoutTaskChat/types.ts`
- **Prompt**: `src/app/(study)/tools/scoutTaskChat/prompt.ts`
- **Social media tools**: `src/ai/tools/social/`

### Key Parameters

```typescript
{
  scoutUserChatToken: string  // Auto-generated, unique identifier
  description: string  // Observation task description (e.g., "Help me find working women's coffee views")
}
```

### Output Structure

```typescript
{
  personas: undefined,  // Historical version may have, removed in new version
  stats: {  // Platform coverage statistics
    "小红书": 6,
    "抖音": 2,
    "Instagram": 1,
    // ...
  },
  plainText: "Social media research completed successfully..."
}
```

---

## Document Version

- **Version**: v1.0
- **Last Updated**: 2026-01-15
- **Maintained by**: atypica.AI Product Team
- **Data Sources**:
  - Code implementation: `src/app/(study)/tools/scoutTaskChat/`
  - User research journey: `docs/product/user-research-journey.md`
  - Prompt design: `src/app/(study)/tools/scoutTaskChat/prompt.ts`
