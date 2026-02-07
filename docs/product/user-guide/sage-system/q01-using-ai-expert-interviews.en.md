# How to Use AI Expert Agent to Interview AI Personas?

## Question Type
User Manual Question

---

## Quick Answer

**Sage (AI Expert System) is NOT for "interviewing AI personas".**

**Sage's True Purpose**:
- ✅ Create **evolvable AI expert advisors** (based on your professional materials)
- ✅ Consult experts anytime (like consulting real experts)
- ✅ Let experts continuously evolve through **supplementary interviews**

**If You Want to "Interview AI Personas"**:
- → Use **Interview** feature (AI Persona Interview)
- → Not Sage

**Sage vs Interview Difference**:
- Interview: You interview AI personas (user simulation) to understand user needs
- Sage: You consult AI experts (expert simulation) for professional advice

---

## What is Sage?

### Core Positioning: Train Your AI Expert Advisor

**Not**:
- ❌ Tool for interviewing users
- ❌ Tool for market research

**But Rather**:
- ✅ Train an AI expert based on your professional materials
- ✅ Consult this expert anytime for professional advice
- ✅ Let expert continuously evolve through dialogue and interviews

---

### Sage vs Interview Comparison

| Dimension | Sage (AI Expert System) | Interview (AI Persona Interview) |
|-----------|------------------------|--------------------------------|
| **Role** | AI expert advisor | AI user simulation |
| **Your Identity** | Consultant | Interviewer/Researcher |
| **Dialogue Purpose** | Get professional advice | Understand user needs |
| **Knowledge Source** | Your uploaded professional materials | atypica's 300K+ persona library |
| **Use Cases** | Enterprise knowledge transfer, personal learning, industry research | Product testing, market research, user insights |
| **Output** | Professional advice and guidance | User feedback and insights |
| **Evolution Method** | Supplementary interviews fill knowledge gaps | No evolution (personas fixed) |

---

## Complete Sage Usage Flow

### Step 1: Create AI Expert

**Upload Professional Materials**:

**Supported Formats**:
- PDF, TXT, Markdown, Audio, DOCX (up to 10 files)
- Text paste
- URL import (auto-scrape webpage content)

**Example Scenario**: Enterprise UX Design Expert

```
Upload Knowledge Sources:
1. design-system-v2.3.pdf (50-page design specifications)
2. ux-principles.md (UX design principles)
3. https://company.com/design-tokens (Design Token documentation)

AI Auto-Processing:
→ Extract plain text: 65,000 words professional knowledge
→ Build Memory Document
→ Generate expert bio and recommended questions
```

---

### Step 2: AI Analyzes and Builds Expert

**AI Auto-Analysis**:

```
Uses Claude Sonnet 4.5 to analyze knowledge sources:
1. Extract expert bio
2. Identify expertise areas
3. Generate recommended questions
4. Build structured Markdown memory document
5. Identify knowledge gaps

Output:
✓ Memory Document v1 created
✓ Expert bio: I'm your company's UX design expert, familiar with design system v2.3...
✓ Expertise: Design system specifications, component library usage, design tokens...
✓ Knowledge gaps: 3 (mobile specifications, animation specs, design decision cases)
```

---

### Step 3: Consult AI Expert (Dialogue)

**Like consulting a real expert**:

```
You: "What should our button corner radius be?"

Sage: "According to our design system v2.3, button corner radius uniformly uses 6px.

      Specific rules:
      - Primary Button: 6px corner radius + 16px padding
      - Secondary Button: 6px corner radius + 12px padding
      - Icon Button: 8px corner radius (circular button)

      This is to form unified visual hierarchy with our card corner radius (8px)
      and input box corner radius (4px)."

→ Next dialogue, Sage still remembers design specifications, no need to repeat
```

---

### Step 4: Supplementary Interview (Expert Evolution)

**When Sage discovers knowledge gaps**:

**Trigger Conditions**:
- Discovers unanswerable questions in dialogue
- Knowledge gaps identified in initial analysis
- User proactively creates supplementary interview

**Supplementary Interview Flow**:

```
Sage discovers knowledge gaps:
- Gap 1: Missing mobile design specifications
- Gap 2: Animation specifications incomplete
- Gap 3: Missing design decision cases

You create supplementary interview:
→ AI interviewer generates interview plan
→ AI interviewer asks you questions
→ You answer (acting as expert)
→ AI auto-updates knowledge base (creates Memory Document v2)
→ Marks resolved Knowledge Gaps

Interview Example:
AI: "Hello! I want to supplement some knowledge about mobile design specifications.
    First question: What are the core differences between our company's iOS and Android design specs?"

You: "Three main differences:
    1. Navigation mode: iOS uses bottom Tab Bar, Android uses Bottom Navigation
    2. Back button: iOS top left, Android uses system back key
    3. Corner radius: iOS prefers larger radius (8-12px), Android 4-6px"

AI: "Understood. You mentioned iOS uses bottom Tab Bar, can you detail its design specifications?
    Such as height, icon size, activated state styling?"

You: "Bottom Tab Bar:
    - Height: 80px (including safe area)
    - Icon: 24×24px, activated color is primary-500
    - Text: 12px, activated font-weight: 600
    - Spacing: Icon-text spacing 4px"

[After interview ends, AI auto-updates knowledge base]

Memory Document v2 created ✓
- New content: Mobile design specifications (detailed)
- Resolved Gaps: 3
- Change description: Supplemented iOS/Android mobile design specifications
```

---

## Sage Use Cases

### Scenario 1: Enterprise Knowledge Transfer

**Background**: Senior employee about to retire, needs to transfer 20 years experience

**Operations**:
```
Step 1: Create "Senior UX Designer - Zhang Wei" Sage
Upload:
- Project docs (50+ projects)
- Design specifications (company design system v1-v3)
- Presentation PPTs (20+ design sharing session PPTs)
- Design review records

Step 2: AI builds expert knowledge base

Step 3: New employees consult Sage
New hire: "What are our product table design best practices?"

Sage (Zhang Wei): "Based on my 20 years experience, B2B product table design
                  should follow these principles:
                  1. Clear information hierarchy...
                  2. Convenient operations...
                  3. Performance optimization...
                  I used this approach in projects X and Y..."

Value:
- Knowledge permanently saved (designer retires, knowledge remains usable)
- Consult anytime (new employees not limited by senior employee's time)
- Continuous evolution (new employees' questions continuously optimize Sage)
```

---

### Scenario 2: Personal Learning Assistant

**Background**: University student studying machine learning course

**Operations**:
```
Step 1: Create "Machine Learning Tutor" Sage
Upload:
- Course PPTs (40 lectures)
- Course notes (Markdown)
- Textbook PDF (Deep Learning Book)
- Papers (BERT, Transformer, etc.)
- Assignment code (Jupyter Notebooks)

Step 2: Consult during learning
Student: "How does backpropagation algorithm work?"

Sage: "According to our course lecture 5, backpropagation works like this:
      1. Forward propagation calculates output...
      2. Calculate loss function...
      3. Backpropagation calculates gradients...
      You already implemented this algorithm in assignment 3 (see hw3_backprop.ipynb).
      Want me to explain a specific step?"

Value:
- Personalized learning (based on own notes)
- Timely Q&A (don't need to wait for office hours)
- Fill knowledge gaps (Sage proactively discovers learning gaps)
```

---

### Scenario 3: Industry Research Expert

**Background**: FinTech industry analyst tracking industry trends

**Operations**:
```
Step 1: Create "FinTech Industry Expert" Sage
Upload:
- Industry reports (McKinsey, iResearch, Gartner)
- Company announcements (10+ FinTech company earnings)
- Research papers (blockchain, payments, digital currency)
- News articles (50+ articles)

Step 2: Quick insights
Analyst: "What are core FinTech trends for 2025?"

Sage: "Based on integrating 5 industry reports and 20+ company announcements,
      2025 FinTech has 3 core trends:
      1. AI-driven risk control upgrade...
      2. Embedded finance explosion...
      3. Digital currency compliance...
      Want me to deeply analyze a specific trend?"

Value:
- Quickly integrate multiple reports
- Continuous updates (immediate updates when new reports release)
- Discover contradictions (auto-discover viewpoint differences in different reports)
```

---

## Sage vs NotebookLM

### Core Differences

| Dimension | Sage | Google NotebookLM |
|-----------|------|------------------|
| **Core Positioning** | Evolvable AI expert agent system | AI research assistant and knowledge management tool |
| **Core Value** | Build continuously learning professional AI advisor | Quickly understand and utilize existing documents |
| **Knowledge Management** | Versioned memory documents + active learning | Static analysis based on uploaded content |
| **Learning Mechanism** | Proactively identify knowledge gaps and supplement through interviews | Passively respond to user queries |
| **Unique Features** | Knowledge Gap tracking, supplementary interviews, knowledge evolution | Audio Overview (documents to podcast), Deep Research |

**Sage Emphasizes "Training Expert"**:
- Knowledge is **dynamically evolving**
- System **proactively discovers** knowledge gaps
- Through **structured interviews** complete knowledge
- **Complete knowledge evolution** tracking

**NotebookLM Emphasizes "Understanding Materials"**:
- Knowledge is **static** (based on uploaded documents)
- **Passively responds** to user queries
- **Innovative output formats** (podcasts, video summaries)
- **Quick start**, low barrier to use

---

## Correct Tool for "Interviewing AI Personas": Interview

If you want to **"interview AI personas" to understand user needs**, should use **Interview** feature:

### Interview Feature Introduction

**Core Purpose**:
- Interview AI personas (user simulation)
- Understand user needs, pain points, decision process
- Test product concepts, pricing, packaging, etc.

**Usage Flow**:

```
Step 1: Create Interview project
Description: "Test acceptance of sparkling coffee new product"

Step 2: Select AI personas (from 300K+ persona library)
- Linda (28, Product Manager, price sensitive)
- Emma (32, Accountant, health anxious)
- Chloe (26, Designer, social early adopter)

Step 3: Start interview
You: "Would you buy ¥18 sparkling coffee?"

Linda: "Probably not, bit expensive. I usually buy ¥12 Americano."

You: "Why do you think it's expensive?"

Linda: "I usually buy ¥12 Americano, ¥18 exceeds my budget."

You: "If it's ¥12, would you buy?"

Linda: "Still no, mainly because sparkling + coffee sounds weird..."

→ Deeply dig user needs and pain points
```

**Difference**:
- Sage: Consult expert for professional advice
- Interview: Interview users to understand user needs

---

## FAQ

### Q1: Can Sage Be Used for Market Research?

**No, Sage is not a market research tool**:

**Sage's Purpose**:
- ✅ Create expert advisor (based on your professional materials)
- ✅ Consult expert advice
- ❌ Cannot do market research

**For Market Research Use**:
- Scout (Social media scanning)
- Interview/Discussion (Interview AI personas)
- Plan Mode (Comprehensive research)

---

### Q2: Can Sage Interview Real Users?

**No**:

**Sage's Role**:
- AI expert advisor (you consult it)
- Not an interview tool

**For Interviewing Real Users Use**:
- AI Persona Interview (interview AI personas)
- Or offline real person interviews

---

### Q3: What Does Sage's "Supplementary Interview" Mean?

**Supplementary Interview Purpose: Fill Sage's Knowledge Gaps**

**Not**:
- ❌ Sage interviews users
- ❌ Sage interviews other AI

**But Rather**:
- ✅ AI interviewer asks you questions
- ✅ You answer (acting as expert)
- ✅ Supplement Sage's missing knowledge

**Flow**:
```
Sage discovers knowledge gap:
"My knowledge base lacks mobile design specifications"

You create supplementary interview:
AI interviewer: "What are our iOS design specifications?"
You: "iOS design specifications include the following..."

After interview ends, Sage auto-updates knowledge base
```

---

### Q4: What's the Difference Between Sage and Memory System?

**Completely different features**:

**Memory System**:
- Remembers your research needs and history
- Personalized AI recommendations
- Auto-extract and organize

**Sage**:
- Create AI expert advisor
- Based on your uploaded professional materials
- Consult expert advice anytime

**Relationship**:
- Memory: User-level memory
- Sage: Expert-level memory
- Dual-layer architecture, complementary

---

### Q5: What Scenarios Suit Sage?

**Suitable**:
- ✅ Enterprise knowledge transfer (senior employee experience)
- ✅ Personal learning assistant (course notes organization)
- ✅ Industry research expert (continuous industry tracking)
- ✅ Professional consulting (legal, medical, technical fields)

**Not Suitable**:
- ❌ Market research (use Scout/Interview)
- ❌ User interviews (use Interview)
- ❌ Real-time data queries (like stock prices)
- ❌ General Q&A (ChatGPT more suitable)

---

## Final Takeaway

> "Sage is not for 'interviewing AI personas', but for creating evolvable AI expert advisors.
> If want to interview AI personas (user simulation), should use Interview feature."

**Remember**:
- ✅ Sage purpose: Create AI expert → Consult expert advice → Supplement knowledge for expert evolution
- ✅ Interview purpose: Select AI personas → Interview users → Understand user needs
- ✅ Completely different: Sage = Expert advisor, Interview = User interview
- ✅ Sage suitable: Enterprise knowledge transfer, personal learning, industry research
- ✅ Interview suitable: Product testing, market research, user insights

---

**Related Feature**: Sage System, AI Persona Interview
**Document Version**: v2.1
