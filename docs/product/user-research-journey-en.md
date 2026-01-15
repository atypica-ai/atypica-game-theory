# atypica.AI User Research Journey

This document demonstrates the complete process of how users conduct business research with atypica.AI through a real-world scenario.

---

## Case Background: Sparkling Coffee Product Validation

A coffee brand plans to launch a "sparkling coffee" product targeting young women aged 25-35. The brand team wants to know:
- Will this product concept resonate with target users?
- What is the price acceptance level?
- How should it be positioned and marketed?

---

## Phase One: Plan Mode - Intent Clarification (2-5 minutes)

### 1. User Inputs Initial Request

The user creates a new research project in atypica.AI and inputs:

```
We're developing a sparkling coffee product and want to test the response
from young female users. We mainly want to know if they like this concept
and what pricing strategy to use.
```

### 2. Plan Mode Agent Works Automatically

Plan Mode AI starts the conversation:

> 💬 **AI**: "I understand - you want to test the sparkling coffee product concept. Let me clarify a few key points first:
>
> 1. What makes the product unique? Is it a blend of bubbles + coffee, or does it have special functional claims?
> 2. When you say 'young women' as the target audience, which specific group do you mean? For example, working professionals, students, or mothers?
> 3. Do you have a preliminary price range? Is it convenience store pricing (¥10-15) or premium coffee pricing (¥25-35)?"

The user provides additional information:

> 👤 **User**: "Yes, it features zero-sugar sparkling water + cold brew coffee, positioned as healthy energy. The target is urban working women aged 25-35. We're thinking of pricing it at ¥18-22."

### 3. AI Automatically Searches Web for Background Research

Plan Mode automatically calls `webSearch` to understand the market context:
- Searches for sparkling coffee market trends
- Reviews competitors (Yuanqi Forest, Saturnbird, etc.)
- Checks consumer discussions

### 4. AI Generates Research Plan and Requests Confirmation

AI uses the `makeStudyPlan` tool to display the complete plan:

> **📋 Research Plan**
>
> **Research Type**: Product Testing Research (Testing)
>
> **Research Methods**:
> 1. **User Discovery Phase** (Scout) - 2 hours
>    - Observe target audience's beverage consumption habits on Xiaohongshu and Douyin
>    - Understand their health concepts and energy-boost scenarios
>    - Build typical user personas
>
> 2. **Concept Testing Phase** (Interview) - 3 hours
>    - Conduct one-on-one in-depth interviews with 5-8 AI personas
>    - Test product concept acceptance
>    - Explore price sensitivity and purchase intent
>
> 3. **Report Generation Phase** - 1 hour
>    - Consolidate all findings
>    - Generate professional testing report
>
> **Estimated Time**: 6-8 hours
> **Estimated Consumption**: ~2 million tokens
>
> **Confirm to start research?**

The user clicks "Confirm Start", and the frontend calls `saveAnalystFromPlan` to save the research configuration.

---

## Phase Two: Execute Research (6-8 hours, runs automatically in background)

### Phase 1: User Discovery - Scout Agent

**AI Begins Social Media Observation**

Study Agent calls the `scoutTaskChat` tool to launch Scout Agent.

#### Observation Phase (First 5 searches)

**1. Xiaohongshu Search**: "working women coffee energy"
- Discovered numerous "3pm lifesaver coffee" posts
- Common user vocabulary: "lifesaver", "emergency", "wake up"
- Noticed repeated mentions of "sugar anxiety"

**2. Xiaohongshu Search**: "zero sugar drinks health"
- Found users highly sensitive to "zero sugar" concept
- Tone shows both "seeking comfort" and "self-doubt"
- Keywords: "Are sweeteners safe?", "Is it really zero calories?"

**3. Douyin Search**: "sparkling water coffee"
- Users show curiosity about sparkling + coffee blend
- Comments: "Will it taste weird?", "Want to try but afraid of disappointment"
- Notice "aesthetic appeal" and "photo-worthy" appear frequently

**4. Instagram Search**: "sparkling coffee"
- Similar products already exist abroad, emphasizing "energizing"
- Visual presentation leans toward "refreshing", "vibrant"
- Users focus on "taste" more than "health"

**5. Xiaohongshu Search**: "convenience store new products coffee"
- Found users have strong willingness to try new things but are price-sensitive
- ¥18-22 is in the "hesitation zone": "A bit expensive but can try"
- Repeat purchase depends on "taste good or not" rather than concept

#### Reasoning Phase (After 5th search, forcefully triggered)

AI calls the `reasoningThinking` tool for social psychology analysis:

> **Reasoning Input**:
>
> **background**:
> "Observed about 40 Xiaohongshu and Douyin posts. Working women (25-35 years old) repeatedly use words like 'lifesaver', 'emergency', 'wake up' when discussing coffee and energy drinks, with a tone that's both self-deprecating and anxious. They're highly concerned about 'zero sugar' but full of skepticism ('Are sweeteners safe?'). They show curiosity about sparkling + coffee blend but worry about 'disappointment'. The ¥18-22 price is seen as 'a bit expensive but can try' - a hesitation zone."
>
> **question**:
> "This group repeatedly uses 'lifesaver' and 'emergency' to express afternoon energy needs, while simultaneously being skeptical and anxious about 'zero sugar'. What value conflict does this reflect? Why do they want to try new things yet fear 'disappointment'? How does this contradictory mindset affect their purchase decision for a ¥18-22 new product?"

**AI Deep Analysis Output** (5-10 minutes of reasoning):

> **Social Psychology Analysis**:
>
> **1. Identity Anxiety vs. Self-Management Conflict**
> - "Lifesaver" reveals a sense of powerlessness under workplace pressure
> - "Zero sugar" anxiety stems from compulsive need for body management
> - They try to regain control through "healthy choices"
>
> **2. Novelty Desire vs. Risk Aversion Balance**
> - Curiosity drives experimentation, but "fear of disappointment" reflects consumer rationalization
> - ¥18-22 isn't about "can't afford it", but "is it worth it"
> - They need a "reason" to convince themselves: aesthetics, photo-worthy, friend recommendation
>
> **3. Group Identity vs. Individual Expression Tension**
> - "Showing off" on social media is for gaining recognition
> - But they resist being labeled as "marketed to", "paying IQ tax"
> - Product needs to balance "trendy feel" with "practicality"

#### Validation Phase (Continue searching 5-8 more times)

With these insights, Scout continues observing to validate:
- Search "afternoon tea photo-worthy office": Validate social motivation
- Search "sweetener anxiety truth": Understand depth of health anxiety
- Search "coffee alternatives value": Confirm price sensitivity points

#### Scout Output

Builds 3 typical AI personas (saved to database):

**1. "Lifesaver Coffee Dependent" Linda**
- 28-year-old operations, crashes every day at 3pm, demands strong energy boost

**2. "Health Anxious" Emma**
- 32-year-old product manager, worries about sweetener safety, reads ingredient labels

**3. "Social Experimenter" Chloe**
- 26-year-old designer, willing to pay for aesthetics and photo-worthiness

---

### Phase 2: In-depth Interviews - Interview Agent

**AI Starts One-on-One Interviews**

Study Agent calls the `interviewChat` tool to conduct interviews with 3 AI personas separately.

#### Interview Example - Linda (Lifesaver Coffee Dependent)

> **AI Interviewer**: "Linda, when do you need coffee most during work?"
>
> **Linda (AI Persona)**: "Around 3pm, I guess. My brain just stops working. The morning Americano has worn off, I must have another cup."
>
> **AI**: "Have you tried other energy-boosting methods?"
>
> **Linda**: "Yeah, Red Bull, Eastroc Super Drink, but they feel unhealthy. Coffee at least looks less intense."
>
> **AI**: "If there's a sparkling coffee, zero sugar, claiming to boost energy while being refreshing, what would you think?"
>
> **Linda**: "Sparkling coffee? Sounds fresh. Zero sugar is good, but... wouldn't it taste weird? Bubbles and coffee mixed together, I can't imagine that flavor."
>
> **AI**: "Why does 'weird' make you hesitate?"
>
> **Linda**: "Because I need a 'lifesaver', not 'experimentation'. If the taste is off, I'd rather stick to my familiar Americano. At that afternoon moment, I'm not in the mood to take risks."
>
> **AI**: "If it's priced at ¥18-22, would you buy it?"
>
> **Linda**: "A bit expensive... convenience store Americano is only ¥10. Unless it really tastes good, or the energy boost is better. You have to show me why the extra ¥8 is worth it."

#### AI Continues Probing (5 Whys technique)

- "Why can't 'lifesaver' and 'experimentation' coexist?"
- "What kind of evidence would convince you the extra ¥8 is worth it?"
- "If a friend recommended it, would you be more willing to try?"

#### Interviewer Automatically Ends and Saves Conclusion

After 7 rounds of dialogue, AI automatically calls `saveInterviewConclusion` to save interview summary:

> **Interview Summary - Linda**
>
> **Core Insights**:
> - Linda's "lifesaver" need is a must-have, with low error tolerance
> - She has positive feelings about "zero sugar" but it's not a decision key
> - Price sensitivity is about "worth it or not" rather than "can afford or not"
> - Needs "efficacy promise" (better energy boost) or "social endorsement" (friend recommendation)
>
> **Memorable Quotes**:
> - "At that afternoon moment, I'm not in the mood to take risks."
> - "You have to show me why the extra ¥8 is worth it."

Similarly, interviews are completed with Emma and Chloe, collecting feedback from different perspectives.

---

### Phase 3: Generate Report - Report Expert

**AI Consolidates All Findings, Generates Professional Report**

Study Agent calls the `generateReport` tool.

#### 1. AI Automatically Organizes Research Log

- Extracts all Scout observations from messages
- Organizes complete dialogues from 3 interviews
- Identifies key quotes and contradictions

#### 2. AI Uses Professional Prompt to Generate HTML Report

- Uses `reportHTMLSystemTesting` prompt
- Claude Sonnet 4.5 generates 8000+ word structured report
- Automatically generates AI cover image (Gemini 2.5 Flash Image)

#### 3. Report Content Structure

```markdown
# Sparkling Coffee Product Testing Research Report

## I. Research Background

- Product concept: Zero-sugar sparkling + cold brew coffee, positioned as healthy energy
- Testing objectives: Validate target user acceptance and pricing strategy
- Information sources: 40+ social media content observations, 3 representative user in-depth interviews

## II. Core Testing Findings

### Finding 1: In "Lifesaver" Scenarios, Energy Boost > Health Concept

**Evidence**:
- Linda (28-year-old operations): "At that afternoon moment, I'm not in the mood to take risks."
- Observation data: Xiaohongshu "3pm lifesaver coffee" topic has 5M+ views
- Competitor comparison: Red Bull, Eastroc Super Drink have higher office scenario sales than premium coffee

**Insight**:
Target users' afternoon energy boost is an "urgent necessity", not "self-indulgent enjoyment".
Their error tolerance for new products is extremely low - once the taste is off, no repeat purchase.

### Finding 2: "Zero Sugar" is a Plus, But Triggers "Sweetener Anxiety"

**Evidence**:
- Emma (32-year-old PM): "Zero sugar is good, but are sweeteners safe? I still need to check the ingredient label."
- Xiaohongshu search: 2000+ posts related to "sweetener anxiety"
- Douyin comments: "Really zero calories?", "Sweeteners also cause weight gain, right?"

**Insight**:
"Zero sugar" attracts their clicks, but "sweetener ingredients" trigger secondary scrutiny.
Need to address sweetener concerns head-on, not avoid them.

### Finding 3: ¥18-22 Price in "Hesitation Zone", Needs Purchase Reason

**Evidence**:
- Linda: "A bit expensive... unless it really tastes good, or the energy boost is better."
- Chloe (26-year-old designer): "If the bottle looks good, I might buy it for photos."
- Observation: Convenience store new products above ¥18, users hesitate "worth it or not"

**Insight**:
Price isn't about "can afford or not", but "worth it or not".
Need to provide clear "reason for the extra ¥8":
- Functional reason: Better energy boost (caffeine content?)
- Emotional reason: Aesthetic photo-worthiness, friend recommendation
- Health reason: Ingredient transparency, sweetener safety endorsement

## III. Unexpected Finding: "Bubbles" is a Double-Edged Sword

**Positive Responses**:
- Chloe: "Bubbles sound refreshing, should be nice in summer."
- Instagram observation: Foreign sparkling coffee emphasizes "refreshing energy"

**Negative Responses**:
- Linda: "Bubbles and coffee mixed together, won't it taste weird?"
- Emma: "Sparkling water makes me bloated, coffee too..."

**Insight**:
"Bubbles" is a product selling point, but also a risk point.
Need tasting experience to eliminate "will it taste weird" concerns.

## IV. Decision Recommendations

### Core Conclusions

1. **Product Positioning**: Emphasize "refreshing energy" rather than "healthy zero sugar"
2. **Pricing Strategy**: ¥18 is the psychological price line, above this needs clear value proposition
3. **Marketing Strategy**: Prioritize "social endorsement" (KOL tasting) over "functional education"

### Implementation Recommendations (Prioritized)

**P0 - Immediate Execution**:

1. **Free Tasting Campaign**: Place tasting samples at office building convenience stores
   - Objective: Eliminate "will it taste weird" flavor concerns
   - Expected effect: Tasting conversion rate 20%+

2. **KOL Social Endorsement**: Invite "workplace bloggers" to taste and share
   - Objective: Provide "friend recommendation" style purchase reason
   - Expected effect: Xiaohongshu topic exposure 1M+

**P1 - Within 3 Months**:

3. **Ingredient Transparency**: Label caffeine content and sweetener types on bottle
   - Objective: Alleviate "sweetener anxiety"
   - Expected effect: Reduce decision hesitation time

4. **Pricing Test**: Test ¥15.9 (convenience store promotion price) vs ¥19.9
   - Objective: Find optimal price point
   - Expected effect: Determine long-term pricing strategy

### Risk Identification

1. **Taste Risk**: If "bubbles + coffee" flavor truly tastes "weird", tasting will backfire
   - Mitigation: Pre-launch internal blind test pass rate > 70%

2. **Repeat Purchase Risk**: After initial trial, how to convert to daily choice?
   - Mitigation: Member points, second cup half price and other retention mechanisms

## V. User Persona Summary

### Linda - Lifesaver Coffee Dependent (40%)

- Core need: 3pm afternoon energy emergency
- Purchase motivation: Efficacy promise (better energy boost)
- Price sensitivity: High, needs "worth it" reason

### Emma - Health Anxious (35%)

- Core need: Healthy energy boost, reduce guilt
- Purchase motivation: Ingredient transparency, sweetener safety
- Price sensitivity: Medium, willing to pay premium for health

### Chloe - Social Experimenter (25%)

- Core need: Fresh experience, social photo-worthiness
- Purchase motivation: Aesthetics, friend recommendation
- Price sensitivity: Low, willing to pay for "new"
```

#### 4. Report Delivery

- Generate PDF download link
- Create online reading page
- Send completion notification to user email

---

## Phase Three: User Receives Value

### 1. Immediate Value

- **Clear Decision Basis**: 3 core findings + 4 implementation recommendations
- **Authentic User Voices**: Complete interview dialogues, traceable
- **Actionable Action Plan**: Prioritized with clear expected outcomes

### 2. Long-term Value

- **AI Persona Assets**: 3 typical user AI personas permanently saved, reusable in future
- **Research History**: Complete research process and reasoning chain, reviewable
- **Persistent Memory**: AI remembers this coffee brand's background, no need to explain again in next research

### 3. Potential Follow-up Actions

Users can build on this report to:
- **Continue Deep Dive**: Create new research to test ¥15.9 vs ¥19.9 pricing
- **Podcast Distribution**: Use Fast Insight to generate podcast for internal training
- **Team Collaboration**: Share with product, marketing, design teams to align decisions based on same insights

---

## Core Technical Highlights

From this workflow, we can see what makes atypica.AI unique:

### 1. Message-Driven Seamless Collaboration

- Plan Mode's dialogue clarification → Scout's observations → Interview's conversations → Report's generation
- All information flows through `messages`, AI automatically understands context
- Users don't need to copy-paste data between different tools

### 2. AI Agent Specialized Division of Labor

- **Scout**: Like an anthropologist conducting field research, immersive social media observation
- **Interviewer**: Like a consultant conducting in-depth interviews, using "5 Whys" technique
- **Report Expert**: Like a business analyst writing reports, emphasizing insights over methodology

### 3. Persistent Memory System

- AI remembers the coffee brand's background, target users, product positioning
- In the next research, no need to repeat "we make coffee"
- Memory system automatically integrates cross-session knowledge

### 4. Traceable Insight Chain

- Every conclusion has clear evidence source
- Users can click on interview dialogues to see complete Q&A process
- Observation data can be traced back to specific social media searches

### 5. Flexible Tool Orchestration

- Not a fixed "3-step process", but AI dynamically calls tools as needed
- Plan Mode might decide to skip Scout, directly do Interview
- Interview might decide to increase to 8 users instead of fixed 5

---

## Comparison with Traditional Research

| Dimension | Traditional Market Research | atypica.AI |
|-----------|----------------------------|------------|
| **Time Cost** | 2-4 weeks (recruit + interview + analysis) | 6-8 hours (automated completion) |
| **Economic Cost** | ¥50K-100K (survey + interview + report) | 2M tokens (approx. ¥50-100) |
| **Sample Authenticity** | Recruited users may "perform" to please | AI personas built from real social media data |
| **Deep Probing** | Limited by interviewer skill and time | AI can probe "why" infinitely |
| **Repeatability** | Hard to recreate same batch of users | AI personas can be called and tested repeatedly |
| **Insight Quality** | Depends on analyst experience | AI integrates multi-source data, systematic analysis |

---

## Other Research Type Examples

### Fast Insight - Quick Podcast Generation

**Scenario**: Want to quickly understand "Gen Z attitudes toward metaverse" and generate podcast content

**Workflow**:
1. Input topic → Plan Mode determines as Fast Insight
2. AI automatically executes 5-stage process:
   - Topic understanding (webSearch x1)
   - Podcast planning (planPodcast)
   - Deep research (deepResearch MCP)
   - Podcast generation (generatePodcast)
   - Completion
3. After 6-8 hours, receive opinion-oriented podcast script + audio

### Product R&D - Product Development

**Scenario**: Explore if "AI assistant + calendar" product idea has market opportunity

**Workflow**:
1. Input product concept → Plan Mode determines as Product R&D
2. AI automatically executes:
   - Market trend analysis (webSearch + reasoningThinking)
   - User need discovery (Scout + Interview)
   - Competitor comparison (webFetch)
   - Idea validation (Discussion group discussion)
   - Generate product R&D report

### Discussion Chat - Group Discussion

**Scenario**: Want to see different user groups' perspective clashes on "subscription vs. one-time purchase"

**Workflow**:
1. Plan Mode determines suitable for Discussion (3-8 person group discussion)
2. AI assembles AI personas with different stances:
   - Price-sensitive users
   - Heavy users
   - Occasional users
3. AI moderator guides discussion, observes perspective clashes
4. Report presents multi-perspective comparison and consensus points

---

## Summary

atypica.AI's core value: **Transforming subjective business research from "art" into "science"** while maintaining depth and humanity of insights.

Through multi-agent collaboration, persistent memory, and traceable insight chains, atypica.AI provides more reliable foundations for business decisions.

---

Last updated: 2026-01-15
