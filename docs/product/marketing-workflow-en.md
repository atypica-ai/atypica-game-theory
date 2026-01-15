# Product Marketing Workflow

This document defines the product marketing content production workflow for atypica.AI, from code to features, and from features to distribution.

---

## Objectives

Through a systematic process, produce:

1. **Objective Product Documentation** (Source of Truth) - The single source of truth for all marketing materials
2. **Compelling Website Landing Pages** - Multiple landing page versions targeting different scenarios, KOLs, and keywords
3. **KOL/Podcast Narratives** - Ready-to-use distribution content

---

## Three-Tier Requirements Structure

### Tier 1: Complete Chain from Code to Product

**Goal**: Deep dive into code to understand what's actually implemented (not imagined or planned, but actually built)

**Methodology**:
1. Read core code implementations (`src/app/(study)/`, `src/ai/tools/`, `src/ai/prompt/`)
2. Understand technical architecture and design philosophy (`docs/architecture/`)
3. Establish mapping relationships: `Code Implementation → User Experience → Product Value`

**Outputs**:
- Feature inventory (implemented vs. planned)
- Technical boundary understanding (what we can and cannot do)
- Product design philosophy distillation

---

### Tier 2: Produce Objective Source of Truth Documentation

**Documentation Requirements**:
- ✅ Extremely objective (zero subjective opinions, only facts and differences)
- ✅ The more detailed, the better (details determine credibility)
- ✅ No verbosity (every sentence contains information)
- ✅ Single source of truth (foundation for all marketing materials)

**Core Question Framework**:

#### A. Feature Comparison

Answer "What's the difference between X and Y?"

**Feature Coverage**:
- Interview vs Discussion
- Scout vs Study Agent
- Fast Insight vs Regular Research
- Sage's Knowledge Gap vs Regular Conversation
- Plan Mode Value
- Memory System Functionality
- AI Persona Three-Tier System (Tier 1/2/3)
- MCP Integration Capabilities
- Reference Research Functionality
- File Attachment Functionality

**Documentation Format** (Mixed Style):
```markdown
## [Feature A] vs [Feature B]: When to Use Which?

### Core Differences
[Comparison table - dimensions, goals, outputs, duration, etc.]

### Scenario Comparison
[List scenarios suited for each, marked with ✅]

### Technical Implementation Differences
[Brief explanation of technical differences]

### What We Can Do
[List specific capabilities, marked with ✅]

### What We Cannot Do
[Distinguish between technical limitations and strategic choices, marked with ❌]
```

#### B. Capability Boundaries

Answer "What can we do and what can't we do?"

**Two Types of "Cannot"**:

**Technical Limitations** (physically impossible or poor results):
- ❌ Cannot fully replace in-person focus group dynamics
  - Reason: AI personas cannot simulate real-world body language and eye contact
  - Applicable scenario: For in-person chemistry, use traditional focus groups

- ❌ Cannot test products requiring physical interaction
  - Reason: AI personas cannot physically touch or use physical products
  - Applicable scenario: UI usability testing and product trials require real people

- ❌ Cannot provide the depth of emotional resonance of real people
  - Reason: AI-simulated emotional understanding is limited
  - Applicable scenario: Brand emotional connection and deep psychological analysis require real interviews

**Strategic Choices** (capable but deliberately not pursued):
- ❌ No real-time collaborative editing
  - Reason: Not core value, avoiding feature bloat

- ❌ No purely quantitative large-sample surveys
  - Reason: Positioned for qualitative research, quantitative has specialized tools

- ❌ No hybrid human researcher + AI persona interviews
  - Reason: Maintaining controllability and repeatability of pure AI simulation

#### C. Competitive Analysis

Answer "atypica vs Product X, what do we do better?"

**Competitor Categories**:

**P0 - Core Competitors** (Focus comparison, detailed analysis):
- Traditional research firms (Ipsos, Nielsen, Kantar)
- User interview platforms (UserTesting + User Interviews)
- Social listening tools (Brandwatch, Sprinklr)
- AI Agent frameworks (LangChain, CrewAI, AutoGen)

**P1 - Related Competitors** (Moderate comparison, clarify differences):
- ChatGPT, Claude (general AI conversation tools)
- Manus (AI workflow automation)
- Survey tools (Wenjuanxing, Typeform)
- Listen Labs (AI-led user interviews)

**P2 - Peripheral Competitors** (Brief mention, clarify boundaries):
- NotebookLM (document understanding + Audio Overview)
- Perplexity (AI search + research assistant)

**Comparison Format** (Table-centric):

```markdown
## atypica.AI vs [Competitor Name]

### Feature Comparison Table

| Feature Dimension | atypica.AI | [Competitor] |
|-------------------|------------|--------------|
| Completion Time | 6-8 hours | [Time] |
| Cost | 2M tokens (~$50-100) | [Cost] |
| Sample Source | 300K synthetic + 10K deep interview AI personas | [Source] |
| Consistency Score | 85 (deep interview) / 79 (social media) | [Score] |
| Traceability | Every conclusion traceable to conversation segments | [Capability] |

### Scenario Suitability Comparison

**Use atypica**:
- ✅ Scenario 1: Need to repeatedly test multiple concepts
- ✅ Scenario 2: Need social media observation + deep interview combination
- ✅ Scenario 3: Limited budget and time

**Use [Competitor]**:
- ✅ Scenario 1: [Competitor advantage scenario]
- ✅ Scenario 2: [Competitor advantage scenario]

### Where We Excel

1. **[Advantage 1]**: Specific explanation
2. **[Advantage 2]**: Specific explanation

### Where They Excel (Objective Acknowledgment)

1. **[Their Advantage 1]**: Specific explanation
2. **[Their Advantage 2]**: Specific explanation
```

---

### Tier 3: Eye-Catching Distribution Design

Based on Tier 2 objective documentation, design distribution content.

#### A. Multiple Website Landing Page Versions

**Goal**: Capture attention within 5 seconds

**Strategy**: Design multiple landing page versions targeting different scenarios, KOLs, and keywords

**Landing Page Types**:

1. **By Target User**:
   - Consultants: "Show consumer evidence, not slides"
   - Marketers: "Real voices, real conversions"
   - Product Managers: "Innovation, de-risked"
   - Creators / Influencers / Startup Owners

2. **By Key Scenario**:
   - "Rapidly validate product concepts"
   - "Understand target user true thoughts"
   - "Predict market reactions"
   - "Cross-cultural market insights"

3. **By Industry Pain Point**:
   - "Traditional research too slow?" → Speed comparison
   - "Limited budget?" → Cost comparison
   - "Worried about sample quality?" → Consistency data
   - "Conclusions unreliable?" → Traceability

**Landing Page Structure** (Attention-grabbing opening):

```markdown
[Headline - Shocking Data or Event]
August 5, 2025: Gartner stock plummets 30%
McKinsey annual growth only 2%, 10% workforce reduction over two years

Traditional research models face structural challenges
atypica.AI was born at this pivotal moment

[Core Data - Establish Credibility]
300,000 AI personas + 10,000 real deep interviews
85 consistency score, exceeding 81% human baseline
6-8 hours to complete what traditionally takes 2-4 weeks

[User Groups - Targeted Pain Points]
[Dynamically adjusted based on landing page version]

[CTA]
Start your first research project
```

**Landing Page Element Library**:

**Industry Turning Point Stories**:
- Gartner stock plummets 30% (August 5, 2025)
- McKinsey annual growth only 2%, 10% workforce reduction over two years
- Traditional models face structural challenges

**Research Results Data**:
- 300,000 synthetic consumer agents
- 10,000 real deep interview-built agents
- 85 consistency score (exceeding 81% human baseline)
- Focus Group and 1-on-1 Interview both have 80%+ real-person overlap

**Technology Evolution Story**:
- Stanford Small Town (2023): AI agent interaction concept
- 1000-person simulation paper (2024): 85%+ behavioral consistency
- Function Calling (Dec 2023): Model calling external tools
- MCP Protocol (Nov 2024): Model operating tool ecosystem
- DeepSeek R1 (Feb 2025): Transparent reasoning process
- Manus/Artifacts/Devin (Mar 2025): Multi-agent product design

**Core Differentiation Advantages** (Sorted by importance):
1. Traceable insight chain (every conclusion has evidence source)
2. Deep social media observation (Scout's anthropological field research)
3. AI Persona three-tier system (Tier 1/2/3, enterprise private data)
4. Group discussion mode (Discussion Chat's viewpoint collision)
5. Research speed + cost (6-8 hours vs 2-4 weeks, $50-100 vs $50-100K)
6. Insight depth (qualitative insights vs surface data statistics)
7. Flexibility (AI dynamically adjusts process as needed)
8. Evolvable expert system (Sage's Knowledge Gap tracking)

#### B. KOL/Podcast Narrative Scripts

**Goal**: Same as website user groups, establish industry awareness

**Strategy**: Ask first, then present (suspense-driven)

**Script Structure** (Suspense-driven):

```markdown
## Opening Question (Create Suspense)

"Why did Gartner plummet 30% in one day?"
"What structural problems has the traditional research model encountered?"

## Industry Background Setup

- Gartner plunge event
- McKinsey growth stagnation
- Brain-intensive, human-driven research models hit growth ceiling
- Capital markets openly acknowledge: Traditional models face challenges

## Problem Revelation

Three major pain points of traditional research:
1. **Time Cost**: 2-4 weeks to receive report
2. **Economic Cost**: Starting from $50-100K
3. **Sample Quality**: Recruited users may "perform" to please

## Solution Introduction

What new possibilities do AI persona simulations provide?

## Technical Principle Explanation

1. **Subjective World Modeling Method**:
   - Feed Harry Potter with corpus, can infer whether he likes coffee
   - Similarly, model consumers, can infer their decisions

2. **Confidence Validation**:
   - Human self-consistency: 81% (answering same question two weeks apart)
   - atypica deep interview personas: 85 score
   - atypica social media personas: 79 score
   - Exceeding human baseline

3. **Scalability Capability**:
   - 300,000 synthetic personas (social media data)
   - 10,000 deep interview personas (1-2 hour real interviews)
   - Intelligently summon relevant personas for simulated interviews

## Data Support (Enhance Confidence)

Interject mentions:
- "In consumer purchase intent testing, whether Focus Group or 1-on-1 Interview, both have 80%+ real-person overlap"
- "Extensive enterprise user feedback: atypica-generated report satisfaction 4.0/5.0, on par with human reports"
- "300,000 personas cover diverse consumer groups, 10,000 deep interview personas continuously growing"

## Live Demo

Play a segment of AI interview recording:
- Scout observing social media
- Interview deep questioning
- Discussion group debate
- Generate traceable research report

## Wow Moment

**Technology Evolution Story**:
- 2023: Stanford Small Town showed us AI agent interaction
- 2024: 1000-person simulation paper proved 85%+ consistency
- 2024: Function Calling and MCP Protocol enabled models to operate external tools
- 2025: DeepSeek R1 demonstrated transparent reasoning process
- **atypica.AI stands on these technology shoulders, focusing on business research**

## Application Scenario Examples

[Choose scenarios relevant to audience]:
- Bubble coffee new product validation (product managers)
- Brand marketing message testing (marketing)
- Cross-cultural market insights (consultants)

## Capability Boundaries (Build Trust)

**What We Can Do**:
- ✅ Rapid concept validation
- ✅ Deep social media observation
- ✅ Traceable insight chain

**What We Cannot Do**:
- ❌ Cannot replace real-person interviews for high-risk decisions
- ❌ Cannot test products requiring physical interaction
- ❌ Cannot provide regulatory compliance-level data

**Clear Positioning**:
"atypica.AI is not a replacement for traditional research, but a powerful complementary tool"

## Future Vision

From insights to action:
- Automated product R&D
- Automated social media operations
- From "research first, decide later" to "research, decide, execute simultaneously"

## Closing Statement

"Starting with agents that understand consumers, atypica.AI transforms business decision-making from 'art' to 'science'"
```

---

## Execution Steps

### Step 1: Feature Documentation Production (Est. 2-3 weeks)

**Priority P0** (Core features, priority completion):
1. Interview vs Discussion
2. Scout Agent Deep Analysis
3. AI Persona Three-Tier System
4. Plan Mode Value Explanation
5. Memory System Mechanism

**Priority P1** (Important features, secondary priority):
6. Fast Insight vs Regular Research
7. Sage Evolvable Expert System
8. MCP Integration Capabilities
9. Reference Research + File Attachments

**Each Feature Document Includes**:
- Core difference comparison table
- Scenario usage explanation
- Technical implementation differences
- Capability boundaries (can do + cannot do)

**Deliverables**:
- `docs/product/features/interview-vs-discussion.md`
- `docs/product/features/scout-agent.md`
- `docs/product/features/ai-persona-tiers.md`
- ... (other features)

### Step 2: Competitive Comparison Documentation Production (Est. 1-2 weeks)

**P0 Core Competitors** (Focus comparison):
1. atypica vs Traditional Research Firms
2. atypica vs UserTesting + User Interviews
3. atypica vs Brandwatch (Social Listening)
4. atypica vs AI Agent Frameworks

**P1 Related Competitors** (Moderate comparison):
5. atypica vs Listen Labs
6. atypica vs Manus
7. atypica vs ChatGPT / Claude
8. atypica vs Survey Tools

**P2 Peripheral Competitors** (Brief mention):
9. atypica vs NotebookLM
10. atypica vs Perplexity

**Deliverables**:
- `docs/product/competitors/vs-traditional-research.md`
- `docs/product/competitors/vs-usertesting.md`
- `docs/product/competitors/vs-brandwatch.md`
- ... (other competitors)

### Step 3: Landing Page Content Design (Est. 1 week)

**By Target User** (6 versions):
1. Consultants Landing Page
2. Marketers Landing Page
3. Product Managers Landing Page
4. Creators Landing Page
5. Influencers Landing Page
6. Startup Owners Landing Page

**By Key Scenario** (4-6 versions):
7. "Rapidly Validate Product Concepts" Landing Page
8. "Understand Target User True Thoughts" Landing Page
9. "Predict Market Reactions" Landing Page
10. "Cross-Cultural Market Insights" Landing Page

**Deliverables**:
- `docs/product/landing-pages/consultants.md`
- `docs/product/landing-pages/marketers.md`
- `docs/product/landing-pages/quick-concept-validation.md`
- ... (other versions)

### Step 4: KOL/Podcast Scripts (Est. 3-5 days)

**Generic Versions** (Applicable to most scenarios):
1. Full Version (30 minutes)
2. Short Version (15 minutes)
3. Lightning Version (5 minutes)

**Custom Versions** (Targeted at specific KOLs/podcasts):
4. Tech-Focused (emphasize technology evolution and architecture)
5. Business-Focused (emphasize ROI and efficiency gains)
6. Academic-Focused (emphasize research methods and confidence)

**Deliverables**:
- `docs/product/kol-scripts/full-version-30min.md`
- `docs/product/kol-scripts/short-version-15min.md`
- `docs/product/kol-scripts/lightning-5min.md`
- `docs/product/kol-scripts/tech-focused.md`
- ... (other versions)

---

## Quality Standards

### Objectivity Checklist

- [ ] All data has sources (code, papers, user feedback)
- [ ] Competitive comparisons objectively acknowledge competitor advantages
- [ ] "What we cannot do" clearly explains reasons
- [ ] Avoid absolute statements ("best", "only", "perfect")
- [ ] Every advantage has evidence support

### Readability Checklist

- [ ] Core information clearly presented in tables
- [ ] Scenario descriptions specific and tangible (using actual examples)
- [ ] Technical details concise but accurate
- [ ] Avoid jargon and terminology overload
- [ ] Each paragraph no more than 3-4 sentences

### Distribution Effectiveness Checklist

- [ ] Landing page conveys core value within 5 seconds
- [ ] Data is shocking but credible (has sources)
- [ ] Story has narrative arc
- [ ] Wow moment naturally embedded
- [ ] Clear CTA at conclusion

---

## Collaboration Model

### Claude's Responsibilities

1. **Research and Understanding**:
   - Deep dive into code and documentation, understand feature implementation
   - Search competitor information, objective comparison
   - Distill core differences and advantages

2. **Content Production**:
   - Produce documentation following above formats
   - Maintain objectivity and accuracy
   - Provide multiple versions for selection

3. **Quality Control**:
   - Self-check against quality standards
   - Flag uncertain areas
   - Proactively ask for clarification where needed

### User's Responsibilities

1. **Strategic Decisions**:
   - Confirm priorities
   - Select document versions
   - Decide distribution strategy

2. **Fact Checking**:
   - Verify data accuracy
   - Supplement competitor information
   - Confirm capability boundaries

3. **Content Review**:
   - Confirm alignment with brand tone
   - Adjust specific wording
   - Approve final versions

---

## Appendix: Quick Reference Data Table

### atypica.AI Core Data

| Data Item | Value | Source |
|-----------|-------|--------|
| Total AI Personas | 300K (synthetic) + 10K (deep interview) | Product data |
| Deep Interview Persona Consistency | 85 score | Research validation |
| Social Media Persona Consistency | 79 score | Research validation |
| Human Self-Consistency Baseline | 81% | Academic research |
| Research Completion Time | 6-8 hours | Product testing |
| Research Cost | 2M tokens (~$50-100) | Product testing |
| User Satisfaction | 4.0/5.0 | User feedback sampling (120 responses) |
| Focus Group Real-Person Overlap | 80%+ | Product validation |
| 1-on-1 Interview Real-Person Overlap | 80%+ | Product validation |

### Industry Comparison Data

| Comparison Item | atypica.AI | Traditional Research Firms | Listen Labs |
|----------------|-----------|---------------------------|-------------|
| Time | 6-8 hours | 2-4 weeks | 24 hours |
| Cost | $50-100 | $50-100K | Not disclosed |
| Sample | 300K+10K AI personas | Real-person recruitment | Real person+AI host |
| Consistency | 85 score (deep interview) | 81 score (human baseline) | Not disclosed |

### Industry Turning Point Data

| Event | Time | Data |
|-------|------|------|
| Gartner Stock Plunge | 2025.08.05 | -30%, largest drop since 1999 |
| McKinsey Growth Stagnation | 2024 annual report | 2% annual growth, 10% workforce reduction over two years |

### Technology Evolution Timeline

| Time | Event | Significance |
|------|-------|--------------|
| 2023 | Stanford Small Town Paper | AI agent interaction concept |
| Dec 2023 | GPT-4 Function Calling | Model calling external tools |
| Nov 2024 | Claude MCP Protocol | Model operating tool ecosystem |
| Nov 2024 | 1000-Person Simulation Paper | 85%+ behavioral consistency validation |
| Feb 2025 | DeepSeek R1 | Transparent reasoning process |
| Mar 2025 | Manus/Artifacts/Devin | Multi-agent product design |

---

**Document Version**: v1.0
**Last Updated**: 2026-01-15
**Owners**: Claude + User Collaboration
