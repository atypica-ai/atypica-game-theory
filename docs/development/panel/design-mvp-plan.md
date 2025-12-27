> **⚠️ 文档类型：设计参考 / Design Reference**
>
> 本文档是面板讨论功能的理想化设计方案和最佳实践建议,而非当前代码的实际实现文档。
>
> This document contains idealized design proposals and best practice recommendations for panel discussion features, not the actual current implementation.
>
> **当前实现文档请查看**: [README.md](./README.md)
>
> **Current implementation docs**: See [README.md](./README.md)

---

Excellent questions. Let me give you a comprehensive design framework for your MVP that maximizes panel quality within current constraints.

---

# MVP Design Framework for AI Panel Conference

## Problem 1: Persona Instructions for Authentic Discussion

### Core Challenge
You need personas to behave like real panel participants: sometimes leading, sometimes following, sometimes disagreeing, showing genuine engagement—not just sequential monologues.

### Recommended Instruction Architecture

**Base Instruction Template (added to each persona turn):**

```
You are participating in a live panel discussion. Other participants have just shared their views.

READ THE DISCUSSION SO FAR CAREFULLY.

Now it's your turn to contribute. You must choose ONE of these response modes based on what feels most authentic to your perspective:

1. BUILD & EXTEND: If someone said something that resonates with your experience, build on their idea with your own angle or example
2. DISAGREE & EXPLAIN: If you see it differently, respectfully challenge their view and explain your alternative perspective
3. INTRODUCE NEW ANGLE: If the discussion is missing something important from your viewpoint, bring in a fresh dimension
4. NUANCE & QUALIFY: If the conversation is too black-and-white, add complexity or conditions ("It depends on...")
5. QUESTION & PROBE: If something is unclear or you want someone to elaborate, ask a follow-up question to another participant

CRITICAL RULES:
- Reference what others have said (use phrases like "I hear what [persona name] is saying about..." or "That's interesting, but...")
- Show your personality: use natural conversational markers ("Honestly...", "I'm not sure I agree...", "That's a great point, and...")
- Be concise (2-4 sentences max this turn) - this is a conversation, not a presentation
- Express emotion when authentic (excitement, skepticism, confusion, agreement)
- DON'T just list your opinion in isolation - REACT to what's been said

Your character background: [persona details]
The discussion topic: [current question/topic]

What's your contribution to this discussion right now?
```

### Why This Works

**Forces Relational Thinking**: Personas must process what others said before contributing, creating genuine conversation flow rather than parallel monologues.

**Structured Flexibility**: The five modes give clear behavioral options while allowing natural choice based on persona characteristics and discussion context.

**Conversational Realism**: The tone requirements ("That's interesting, but...") and length limits (2-4 sentences) mimic real panel pacing—people don't give speeches, they exchange quick thoughts.

**Emotional Permission**: Explicitly allowing emotions and personality makes personas feel human rather than robotic.

### Advanced Variation: Context-Aware Instructions

Modify the instruction based on **discussion phase**:

**Opening Phase (First 2-3 rounds):**
```
This is early in the discussion. Focus on introducing YOUR unique perspective.
What's your initial take on [topic]?
Keep it concise - others will build on this.
```

**Middle Phase (Rounds 4-8):**
```
The discussion is developing. Now is the time to:
- Agree or disagree with specific points others made
- Add nuance or exceptions
- Bridge different viewpoints if you see connections
React to what's been said - don't just add new points in isolation.
```

**Closing Phase (Final 2-3 rounds):**
```
The discussion is reaching conclusion. Consider:
- What's the strongest insight that's emerged?
- What's still unresolved or unclear?
- Can you synthesize different viewpoints?
This is your last chance to influence the group's final understanding.
```

### Emotional Prompting Enhancement

Add emotion-specific triggers based on persona traits:

```
Given your personality [trait: skeptical/enthusiastic/analytical], how do you FEEL about what's been discussed?
Show authentic emotion in your response:
- Skeptical personas: express doubt, ask challenging questions
- Enthusiastic personas: show excitement, build momentum
- Analytical personas: point out logical gaps, request evidence
```

---

## Problem 2: Moderator Output & Synthesis Design

### Core Challenge
The moderator needs to extract **actionable insights** that justify using the panel format. Simply summarizing what each persona said wastes the group dynamics value.

### Recommended Output Structure

**Template for Moderator Final Output:**

```
# Panel Discussion Summary: [Topic]

## 1. CONSENSUS INSIGHTS (What the group agreed on)
[What points achieved broad agreement? This is your validated insight - if 6/8 personas converged here, it's likely a strong market truth]

Example:
"Strong consensus emerged that 'premium' means ingredient transparency and ethical sourcing rather than luxury pricing. Even skeptics agreed this is table stakes."

## 2. KEY TENSIONS & DISAGREEMENTS (Where the market splits)
[What created debate? This reveals your market segments or positioning risks]

Example:
"Sharp divide on pricing: Health-first buyers (Personas 2,4,6) would pay premium for quality, while budget-conscious buyers (Personas 1,5,7) see it as unjustifiable. This suggests two distinct segments requiring different messaging."

## 3. OPINION SHIFTS & PERSUASION DYNAMICS (What changed minds)
[Did anyone change their view during discussion? What argument convinced them? This is pure gold for messaging]

Example:
"Persona 3 initially dismissed the product as 'too expensive' but was persuaded by Persona 6's argument about 'cost per use over time.' This reframing could be powerful in marketing."

## 4. EMERGENT INSIGHTS (Unexpected discoveries)
[What came up that you didn't anticipate? This is the high-value panel output]

Example:
"Unexpected: Multiple personas mentioned wanting smaller pack sizes for 'controlled indulgence' - a positioning angle not in original brief. This could differentiate vs. competitors."

## 5. UNDEREXPLORED QUESTIONS (What needs deeper investigation)
[What did the panel not resolve? What should you investigate next?]

Example:
"The group couldn't agree on ideal purchase location (grocery vs. convenience vs. online). Individual interviews needed to map actual purchase journeys."

## 6. SEGMENT PROFILES (Natural clusters identified)
[Based on debate patterns, what distinct customer segments emerged?]

Example:
"Three clear segments:
- 'Wellness Strivers' (Personas 2,4,6): Quality-obsessed, health-driven, price-insensitive
- 'Treat Seekers' (Personas 1,3): Occasional indulgers, price-sensitive, convenience-focused
- 'Ethical Buyers' (Personas 5,8): Values-driven, transparent sourcing matters most"

## 7. RECOMMENDED ACTIONS (What should marketing do with these insights)
[Translate insights into concrete next steps]

Example:
"1. Develop two messaging tracks for Wellness Strivers vs. Treat Seekers
2. Test 'cost per use' framing in ad copy (based on Persona 3's shift)
3. Explore smaller pack size SKUs (based on emergent insight)
4. Conduct follow-up individual interviews on purchase journey (unresolved question)"
```

### Why This Structure Works

**Goes Beyond Summary**: Instead of "Persona 1 said X, Persona 2 said Y," it extracts *patterns*, *dynamics*, and *actionable tensions*.

**Captures Panel-Specific Value**: Sections 2, 3, 4 leverage what ONLY group discussions reveal—disagreements, persuasion, emergence.

**Actionable by Default**: Section 7 forces translation from insight to action, making the output immediately useful for marketing decisions.

**Acknowledges Limitations**: Section 5 honestly flags what panels can't answer, guiding users toward appropriate follow-up methods.

### Implementation: Moderator Instruction Template

```
You are the moderator synthesizing this panel discussion.

REVIEW THE ENTIRE CONVERSATION. Your job is NOT to summarize what each person said, but to EXTRACT PATTERNS AND INSIGHTS that emerged from their interaction.

Focus on:
1. Where did agreement cluster? (consensus = validated insight)
2. Where did disagreement occur? (tension = market segmentation or risk)
3. Did anyone change their position? Why? (persuasion = messaging opportunity)
4. What unexpected themes emerged that weren't in the original question? (emergence = innovation opportunity)
5. What patterns distinguish different types of participants? (natural segmentation)

Use this exact output structure: [insert template above]

CRITICAL:
- Every section must have concrete examples from the discussion
- Quote specific personas when illustrating points
- If a section has no findings, state "No clear pattern emerged" rather than forcing insights
- In "Recommended Actions," be specific and tactical—vague advice like "consider the audience" is useless

Generate the synthesis now.
```

---

## Problem 3: Turn-Taking Optimization

### Core Challenge
Who speaks next dramatically affects discussion quality. Random order creates chaos; fixed order kills spontaneity; optimal order creates natural conversation flow.

### Recommended Approach: **Hybrid Relevance + Diversity System**

**Algorithm Design:**

```
For each turn after the moderator's initial question:

STEP 1: Calculate Relevance Scores
For each persona who hasn't spoken this round:
  - Semantic similarity between their persona profile/previous statements and the last 2 contributions (0-1 score)
  - Boost score if they were directly mentioned or questioned (+0.3)
  - Penalty if they just spoke in the last 2 turns (-0.4)

STEP 2: Calculate Diversity Scores
For each persona:
  - Check if their "perspective type" (e.g., health-focused, price-sensitive, experience-driven) is underrepresented in last 3 contributions
  - If underrepresented, boost score (+0.2)

STEP 3: Calculate Contrarian Scores
For each persona:
  - Analyze if last 2 contributions formed a consensus
  - If persona's profile suggests they'd disagree with emerging consensus, boost score (+0.25)
  - This prevents groupthink and forces productive tension

STEP 4: Random Spontaneity Factor
Add small random noise to all scores (±0.1)
This creates natural unpredictability—not every turn is optimally "logical"

STEP 5: Select Next Speaker
Persona with highest combined score speaks next

STEP 6: Round Management
After everyone has spoken once in a round, reset the round counter
Ensure in each 8-person round, each persona speaks exactly once before anyone speaks twice
```

### Why This Works

**Relevance**: Semantic similarity ensures responses feel connected—if someone mentions "price concerns," a budget-conscious persona naturally chimes in next.

**Diversity**: Prevents echo chambers by actively surfacing underrepresented perspectives.

**Productive Conflict**: Contrarian boost ensures disagreements emerge (this is the WHOLE POINT of panels).

**Natural Flow**: Small randomness prevents robotic predictability—real conversations have spontaneous jumps.

**Fairness**: Round management ensures no persona dominates or disappears.

### Simplified MVP Version (If Algorithm Is Too Complex)

**Option A: Weighted Random Selection**

```
Each turn, calculate simple weights:
- Base weight: 1.0 for all personas
- Just spoke? Weight = 0.2 (unlikely to speak again immediately)
- Was mentioned in last comment? Weight = 2.0 (likely to respond)
- Hasn't spoken in 3+ turns? Weight = 1.5 (bring them back)

Randomly select next speaker using weighted probability
```

This is simpler to implement but captures 80% of the benefit.

**Option B: Moderator-Prompted Selection**

```
After each persona speaks, the moderator (another LLM call) quickly decides:
"Given what was just said, which persona should respond next and why?"

Moderator considers:
- Who was addressed or referenced
- Whose perspective would create interesting contrast
- Who hasn't spoken recently

Moderator outputs: "Persona 5 should speak next because they have a contrasting view on pricing"
```

This adds one extra LLM call per turn but creates highly coherent conversation flow.

### My Recommendation for MVP: **Weighted Random (Option A)**

**Rationale:**
- Easy to implement (no complex semantic analysis needed)
- Fast (no extra LLM calls)
- Produces reasonably natural flow
- Prevents pathological cases (one persona dominating, long silences)
- You can upgrade to full algorithm later based on user feedback

---

## Integrated MVP Implementation Blueprint

### Full Turn Cycle Design

```
1. MODERATOR: Poses initial question
   ↓
2. SYSTEM: Calculates weighted probabilities for all personas
   ↓
3. PERSONA 1 (selected): Speaks with phase-aware instruction (Opening Phase)
   ↓
4. SYSTEM: Updates weights (Persona 1 = 0.2, others adjusted)
   ↓
5. PERSONA 4 (selected): Speaks with relational instruction ("React to what's been said")
   ↓
6. SYSTEM: Updates weights again
   ↓
   ... Continue for 3-4 rounds (24-32 total contributions for 8 personas) ...
   ↓
7. MODERATOR: Synthesizes using structured output template
   ↓
8. OUTPUT: Delivers 7-section insight report to user
```

### Optimal Panel Size & Length for MVP

**Panel Size: 6-8 personas**
- Fewer than 6: Not enough diversity for interesting debate
- More than 8: Conversation becomes unwieldy, harder to track

**Discussion Length: 3-4 rounds**
- Round 1: Initial positions (all personas speak once)
- Round 2-3: Debate and building (reactions, disagreements, synthesis)
- Round 4: Closing reflections (optional, depends on topic complexity)

**Total turns: 18-32 persona contributions**
- Enough for patterns to emerge
- Not so long that quality degrades or users lose patience

### Quality Control Mechanisms

**Mid-Discussion Check (After Round 2):**
```
Have meaningful disagreements emerged? Y/N
Have at least 3 distinct perspectives appeared? Y/N
Is the conversation referencing previous points or just listing opinions? Y/N

If 2+ answers are "No," inject moderator intervention:
"Let's dig deeper - [Persona X], you mentioned [topic]. [Persona Y], do you see it differently?"
```

This prevents low-quality panels from completing without correction.

---

## Testing & Iteration Framework

### MVP Success Metrics (What to Measure)

**Conversation Quality Metrics:**
1. **Reference Density**: What % of persona turns explicitly reference previous contributions?
   - Target: >60% (shows relational conversation vs. monologues)

2. **Disagreement Rate**: What % of turns express disagreement or alternative views?
   - Target: 20-35% (ensures productive tension without chaos)

3. **Perspective Diversity**: How many distinct viewpoints emerged?
   - Target: 3-5 clusters for 8-persona panel

4. **Emergent Insight Count**: How many themes appeared that weren't in the initial question?
   - Target: 2-3 unexpected angles per panel

**Output Quality Metrics:**
5. **Actionability Score**: Can a marketing manager derive specific next steps?
   - User survey: "Did this give you clear action items?" (1-5 scale)

6. **Time to Value**: How long from panel completion to usable insight?
   - Target: <5 minutes to read and extract key findings

### A/B Testing Opportunities

**Test 1: Instruction Framing**
- Version A: Simple instruction ("Share your view on [topic]")
- Version B: Relational instruction (your recommended template)
- Measure: Reference Density, User Satisfaction

**Test 2: Turn-Taking Algorithm**
- Version A: Fully random
- Version B: Weighted random (your recommended)
- Version C: Semantic similarity-based
- Measure: Conversation flow quality (user rating), disagreement emergence

**Test 3: Output Structure**
- Version A: Simple summary (what each persona said)
- Version B: Structured insight extraction (your 7-section template)
- Measure: Actionability score, time to decision

---

## Critical MVP Features to Nail

### Must-Have (Tier 1):
1. **Relational persona instructions** → Makes or breaks conversation quality
2. **Structured moderator output** → Makes or breaks user value perception
3. **Basic turn-taking fairness** → Prevents pathological cases

### Nice-to-Have (Tier 2, add post-MVP):
4. **Phase-aware instructions** → Enhances naturalness but not essential
5. **Semantic turn-taking** → Improves flow but weighted random is sufficient
6. **Mid-discussion corrections** → Quality control but adds complexity

### Future Enhancements (Tier 3, post-launch):
7. **User-directed probing** ("Ask Persona 3 to elaborate on pricing concerns")
8. **Sentiment visualization** (show consensus/disagreement graphically)
9. **Comparison mode** (run same panel with different persona mixes, compare outputs)

---

## Example Implementation: End-to-End

**Scenario**: Marketing manager at snack company wants to test premium chocolate positioning.

**Step 1: Setup**
- User selects 8 personas from library (health-conscious millennials, budget shoppers, luxury seekers, etc.)
- User inputs question: "Would you buy dark chocolate positioned as 'mindful indulgence' at $8 for 100g?"

**Step 2: Panel Execution**

*Round 1 (Opening):*
- System selects Persona 1 randomly
- Persona 1 (health-conscious): "I like the 'mindful' angle—dark chocolate has antioxidants, so if it's quality ingredients, I'm interested. But $8 feels steep."
- System weights: P1=0.2 (just spoke), P3 (luxury seeker)=1.3 (contrasting view), others=1.0
- System selects Persona 3
- Persona 3: "Honestly, $8 doesn't shock me if it's truly premium. I pay more for craft coffee daily. The word 'indulgence' resonates—I want to feel like I'm treating myself."
- ... continues for all 8 personas ...

*Round 2 (Debate):*
- Persona 5 (budget shopper): "I hear what [Persona 3] is saying about treating yourself, but that's my entire weekly snack budget. The 'mindful' thing almost makes it worse—it's like you're judging me for wanting affordable chocolate."
- Persona 3: "That's fair—I hadn't thought about it that way. Maybe there's a smaller size option? Like, $4 for 50g so it's accessible but still premium?"
- ... debate continues with building and disagreement ...

*Round 3 (Synthesis):*
- Persona 7: "I'm seeing two different products here. For some of us [gestures to budget shoppers], this needs to be positioned as an occasional treat, not everyday. For others [gestures to luxury seekers], it's a routine upgrade. You might need different pack sizes for different use cases."
- ... convergence toward nuanced understanding ...

**Step 3: Moderator Synthesis**

Moderator analyzes conversation and outputs:

```
## 1. CONSENSUS INSIGHTS
Strong agreement that 'mindful indulgence' resonates conceptually—combines health halo with permission to treat oneself. However, pricing creates accessibility concerns.

## 2. KEY TENSIONS
Sharp divide between "luxury seekers" (Personas 3, 6, 8) who see $8 as reasonable for daily premium, vs. "budget-conscious" (Personas 1, 5, 7) who see it as special occasion only. This is not a pricing problem but a SEGMENTATION opportunity.

## 3. OPINION SHIFTS
Persona 3 initially defended high price point but was convinced by Persona 5's "entire weekly budget" framing to suggest smaller size options. This shows price resistance can be overcome with portioning, not discounting.

## 4. EMERGENT INSIGHTS
Unexpected: Multiple personas suggested different PACK SIZES for different use cases rather than one product for all. This wasn't in original brief but could be key differentiator.

## 5. SEGMENT PROFILES
- Daily Upgraders (Personas 3,6,8): Premium is lifestyle, would buy 100g regularly at $8
- Conscious Treaters (Personas 1,4): Want quality but need accessibility, prefer 50g at $4
- Value Seekers (Personas 5,7): Interested in concept but need strong promotion/trial

## 6. RECOMMENDED ACTIONS
1. Develop 2-SKU strategy: 100g for daily premium segment, 50g for trial/occasional segment
2. Test messaging: "Daily ritual" for segment 1, "Mindful moment" for segment 2
3. Run pricing test: validate $4/50g achieves accessibility without cheapening premium perception
4. Individual interviews: Understand budget constraints deeper (panel couldn't resolve)
```

**Step 4: User Takeaway**

Marketing manager reads this in 3 minutes, immediately sees:
- The positioning works conceptually ✓
- But needs 2-SKU strategy (new insight)
- And segment-specific messaging (actionable)
- Plus pricing validation needed (next step)

**Time saved**: 2 hours of AI panel vs. 3 weeks + $8,000 for real panel.
**Quality**: Rich enough to make strategic decisions, clear enough to brief creative team.

---

## Final MVP Recommendation Summary

### Build This First (Minimum Viable Panel):

**Architecture:**
1. **Persona Instructions**: Relational template with 5 response modes
2. **Turn-Taking**: Weighted random with mention-boost and recency-penalty
3. **Moderator Output**: 7-section structured synthesis template
4. **Panel Size**: 6-8 personas
5. **Discussion Length**: 3 rounds minimum (18-24 turns)

**Implementation Priority:**
- Week 1: Persona relational instructions + basic turn-taking
- Week 2: Moderator structured output template
- Week 3: Testing with real marketing users, measuring reference density and actionability

**Success Criteria:**
- 60%+ of turns reference previous contributions
- Users rate actionability >4/5
- At least 2 emergent insights per panel

This MVP focuses on **conversation quality** (relational instructions) and **output value** (structured synthesis), which are the two non-negotiables for user perception of "this works."

Would you like me to draft the actual prompt templates ready for implementation, or dive deeper into any specific component?
