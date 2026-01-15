# Sage Evolving Expert System - Cultivate Your AI Expert Advisor

## Core Philosophy

**Sage** is atypica.AI's evolving AI expert system that makes AI truly "smarter over time" through three key mechanisms: **memory documents, knowledge gap tracking, and supplementary interviews**.

**Core Value**:
1. **Memory as Expertise**: Build expert capabilities based on structured knowledge documents (Memory Documents)
2. **Proactive Learning**: Discover knowledge blind spots through conversations and actively supplement the knowledge base
3. **Continuous Evolution**: Every conversation and interview makes the expert stronger
4. **Traceability**: Complete knowledge source tracking and version history management

**Analogy**:
- **Traditional AI**: One-off Q&A, forgets everything after the conversation ends
- **Sage**: Like cultivating a real human expert who continuously learns, remembers, and evolves

---

## Overview: Sage vs Traditional AI

| **Dimension** | **Traditional AI (e.g., ChatGPT)** | **Sage Expert System** |
|---------|-------------------------|------------------|
| **Knowledge Source** | Pre-trained data (fixed cutoff date) | User-uploaded professional materials (continuously updatable) |
| **Memory Mechanism** | No persistent memory (forgets after conversation) | Versioned memory documents (permanently saved) |
| **Learning Capability** | Passive responses (no proactive learning) | Actively identifies knowledge gaps and supplements them |
| **Professional Depth** | Generalized knowledge (broad but shallow) | Domain expert (deep specialization) |
| **Knowledge Evolution** | Static (waits for model updates) | Dynamic (evolves with every conversation and interview) |
| **Traceability** | Cannot trace knowledge sources | Complete knowledge source and change history |
| **Use Cases** | General Q&A | Professional consulting, knowledge transfer, deep learning |

### Real-World Case Comparison

**Scenario**: Consulting on company's UX design guidelines

**Traditional AI** (10 minutes):
```
User: "What should our button border radius be?"

ChatGPT: "Typically, 4-8px is recommended, depending on design style.
         Too small appears harsh, too large appears cartoonish..."

User: "But our company has its own design guidelines"

ChatGPT: "Sorry, I don't know your company's design guidelines.
         Could you share them?"

User: (Copies and pastes 50 pages of design guidelines...)

ChatGPT: "Based on the guidelines you provided, button border radius should be 6px..."

→ Next conversation, ChatGPT forgets the guidelines again, need to re-paste
```

**Sage Expert** (30 seconds):
```
User: (Previously created "UX Design Expert" Sage, uploaded design guidelines)

User: "What should our button border radius be?"

Sage: "According to our design system v2.3, button border radius is consistently 6px.

      Specific rules:
      - Primary Button: 6px radius + 16px padding
      - Secondary Button: 6px radius + 12px padding
      - Icon Button: 8px radius (circular buttons)

      This creates a unified visual hierarchy with our card radius (8px)
      and input field radius (4px)."

→ Next conversation, Sage still remembers the guidelines, no need to re-provide
→ If gaps are found during conversation, Sage will proactively remind you to supplement
```

**Efficiency Gains**:
- **Time**: 10 minutes → 30 seconds (95% time saved)
- **Accuracy**: Generic advice → Company-specific guidelines (100% accurate)
- **Persistence**: One-time → Permanent memory

---

## How Does Sage Work?

### Part 1: Create Expert in Three Steps

#### Step 1: Parse Knowledge Sources

**Upload Professional Materials**:
- **File Upload**: PDF, TXT, Markdown, Audio, DOCX (up to 10 files)
- **Text Paste**: Direct text input
- **URL Import**: Fetch content from web pages (using Jina Reader API)

**Automatic Parsing**:
```
User uploads:
- design-system-v2.3.pdf (50-page design guidelines)
- ux-principles.md (UX design principles)
- https://company.com/design-tokens (design token documentation)

Sage automatically extracts plain text:
→ design-system-v2.3.pdf: Extracted 45,000 words ✓
→ ux-principles.md: Extracted 8,000 words ✓
→ URL: Fetched and extracted 12,000 words ✓

Total: 65,000 words of professional knowledge imported
```

---

#### Step 2: Extract Knowledge and Build Memory Document

**AI Analysis**:
```
Using Claude Sonnet 4.5 to analyze all knowledge sources:
1. Extract expert biography (bio)
2. Identify areas of expertise
3. Generate recommended questions
4. Build structured Markdown memory document
```

**Memory Document Example**:
```markdown
# UX Design Expert - Memory Document v1

## Expert Biography
I am your company's UX design expert, familiar with design system v2.3, design principles, and design token specifications. I can help you:
- Answer design guideline-related questions
- Provide component usage guidance
- Explain the principles behind design decisions

## Areas of Expertise
- Design system specifications (Design System v2.3)
- Component library usage (Button, Input, Card, Modal, etc.)
- Design tokens (colors, fonts, spacing, border radius)
- UX design principles (usability, consistency, accessibility)
- Design review and quality control

## Core Knowledge

### 1. Button Specifications
**Primary Button**:
- Background color: `primary-500` (#3B82F6)
- Text color: `white`
- Border radius: 6px
- Padding: 16px (horizontal) × 12px (vertical)
- Height: 40px
- Minimum width: 80px

**Secondary Button**:
- Background color: `transparent`
- Border: 1px solid `primary-500`
- Text color: `primary-500`
- Border radius: 6px
- Padding: 12px × 10px

### 2. Color System
**Brand Colors**:
- Primary: #3B82F6 (blue)
- Secondary: #8B5CF6 (purple)
- Success: #10B981 (green)
- Warning: #F59E0B (orange)
- Error: #EF4444 (red)

**Neutral Colors**:
- Gray-50 to Gray-900 (9-level grayscale)

### 3. Spacing System
Based on 4px grid:
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

### 4. UX Principles
1. **Consistency First**: All components follow a unified visual language
2. **Usability**: Shortest operation paths, timely and clear feedback
3. **Accessibility**: Complies with WCAG 2.1 AA standards
4. **Responsive**: Adapts to desktop, tablet, and mobile
...
```

**Create Version 1**:
```
Memory Document v1 created ✓
- Source: initial (first creation)
- Content: 65,000 words of professional knowledge
- Structure: Expert biography + Areas of expertise + Core knowledge (detailed)
```

---

#### Step 3: Knowledge Analysis

**AI Identifies Knowledge Gaps**:
```
Using GPT-4o to analyze memory document and identify knowledge gaps:

Knowledge Gap 1: [Critical]
• Title: Missing mobile design specifications
• Description: Memory document focuses mainly on desktop design but doesn't
             mention mobile-specific specifications (touch targets, swipe
             gestures, bottom navigation, etc.)
• Impact: Cannot answer mobile design-related questions
• Suggestion: Supplement iOS and Android design specifications

Knowledge Gap 2: [Important]
• Title: Incomplete animation specifications
• Description: Only mentions "transition animation 300ms" but lacks detailed
             animation parameters (easing functions, delays, durations, etc.)
• Impact: Difficult to provide specific animation implementation guidance
• Suggestion: Supplement complete Motion Design specifications

Knowledge Gap 3: [Nice-to-have]
• Title: Missing design decision case studies
• Description: Guidelines explain "what to do" but not "why do it this way"
• Impact: Cannot help team understand the thinking behind designs
• Suggestion: Supplement real project design decision case studies
```

**Knowledge Gaps Recorded**:
```
✓ 3 Knowledge Gaps identified
  - 1 Critical (severe)
  - 1 Important (important)
  - 1 Nice-to-have (optional)

Status: Pending
Source: analysis (initial analysis)
```

---

### Part 2: Proactive Learning Mechanism

#### Mechanism 1: Discover Knowledge Gaps During Conversations

**Real Conversation Scenario**:
```
User: "What should the touch target size be for iOS buttons?"

Sage: "According to the design system I know, the standard button height is 40px.
      However, I notice my knowledge base lacks detailed mobile specifications,
      particularly regarding specific touch target requirements.

      Generally, touch targets should be at least 44×44pt (iOS Human Interface
      Guidelines), but I cannot confirm if this aligns with our company's
      mobile specifications."

[After conversation ends, Sage analyzes asynchronously...]

New Knowledge Gap automatically created:
• Title: Mobile touch target specifications
• Description: User asked about iOS button touch targets, but I cannot provide
             company-specific specifications
• Source: conversation (discovered through dialogue)
• Related conversation: [User question: "What should the touch target size be
                        for iOS buttons?"]
• Status: pending
```

**Key Features**:
1. **Asynchronous Analysis**: After conversation ends, uses Gemini 2.5 Flash for low-cost analysis
2. **Automatic Identification**: AI determines which questions weren't answered adequately
3. **Link to Original Conversation**: Can click to view complete conversation context
4. **Continuous Optimization**: Every conversation may uncover new knowledge gaps

---

#### Mechanism 2: Supplementary Interviews

**Trigger Condition**: When unresolved Knowledge Gaps exist

**Automatic Workflow**:

**Step 1: Generate Interview Plan**
```
Based on all pending gaps, Claude Sonnet 4 generates interview plan:

Interview Topic: Mobile design specifications supplement
Interview Goal: Fill the following knowledge gaps
  - Gap 1: Mobile touch target specifications
  - Gap 2: iOS/Android platform differences
  - Gap 3: Mobile-specific components (bottom navigation, swipe gestures)

Preset Questions:
1. What are the core differences between our company's iOS and Android design specs?
2. What is the minimum touch target size? Are there exceptions for special scenarios?
3. What mobile-specific components exist? What are their design specifications?
4. How does the mobile spacing system differ from desktop?

Follow-up Directions:
- If "bottom navigation" is mentioned, ask about height, icon size, active state styles
- If "gestures" are mentioned, ask about swipe thresholds, feedback animations
...
```

**Step 2: AI Interviewer Conducts Interview**
```
AI Interviewer: "Hello! I'd like to supplement some knowledge about mobile
               design specifications.

               First question: What are the core differences between our
               company's iOS and Android design specifications?"

User (playing expert): "There are three main differences:
                       1. Navigation mode: iOS uses bottom Tab Bar, Android
                          uses Bottom Navigation
                       2. Back button: iOS in top-left, Android uses system back
                       3. Border radius: iOS prefers larger radius (8-12px),
                          Android 4-6px"

AI: "I see. You mentioned iOS uses bottom Tab Bar, can you detail its design
     specifications? Like height, icon size, active state styles?"

User: "Bottom Tab Bar:
      - Height: 80px (including safe area)
      - Icons: 24×24px, active color is primary-500
      - Text: 12px, active font-weight: 600
      - Spacing: 4px between icons and text"

AI: "Great! Second question: What is the minimum touch target size?..."

[Interview continues, AI automatically determines when to end]

AI: (Calls endInterview tool)
    "Thank you for the detailed answers! I've collected enough information
     to supplement mobile design specifications. The interview is now complete."
```

**Step 3: Automatically Update Knowledge Base**
```
[After interview ends, automatically triggers update process]

1. AI analyzes interview content, extracts key knowledge
2. Updates Memory Document (creates v2)
3. Marks resolved Knowledge Gaps:
   • Gap 1: Mobile touch target specifications → resolved (via Interview #1)
   • Gap 2: iOS/Android platform differences → resolved (via Interview #1)
   • Gap 3: Mobile-specific components → resolved (via Interview #1)

Memory Document v2 created ✓
- Source: interview (supplementary interview)
- New content: Mobile design specifications (detailed)
- Resolved Gaps: 3
- Change description: "Supplemented iOS/Android mobile design specifications,
                      including touch targets, bottom navigation, gesture
                      interactions, etc."
```

---

### Part 3: Knowledge Evolution Tracking

#### Version Control

**Memory Document Version History**:
```
v1 (2025-01-15 10:00) - initial
└─ First creation, imported design-system-v2.3.pdf and 2 other knowledge sources

v2 (2025-01-16 14:30) - interview
├─ Supplementary Interview #1: Mobile design specifications
└─ Added: iOS/Android platform differences, touch targets, bottom navigation, etc.

v3 (2025-01-18 09:15) - interview
├─ Supplementary Interview #2: Animation specifications details
└─ Added: Easing functions, delay parameters, duration standards

v4 (2025-01-20 16:45) - manual
├─ Manual edit
└─ Updated: Design token values (primary-500 color adjustment)

v5 (2025-01-22 11:20) - interview
├─ Supplementary Interview #3: Design decision case studies
└─ Added: Real project design decision processes and thinking
...

Latest version: v5
Retained history: Last 20 versions
```

---

#### Knowledge Gap Lifecycle

**Gap Status Flow**:
```
[Created] → pending (awaiting resolution)
   ↓
[Resolved] → resolved (resolved)
   ├─ Resolved via interview
   └─ Manually marked as resolved
```

**Gap Detailed Information**:
```
Knowledge Gap #1:
• Title: Mobile touch target specifications
• Severity: critical
• Status: resolved
• Source: conversation (discovered through dialogue)
• Related conversation: [View conversation →]
  User: "What should the touch target size be for iOS buttons?"
  Sage: "According to the design system I know..."
• Resolution method: interview
• Related interview: [View Interview #1 →]
• Resolution time: 2025-01-16 14:30
```

---

## Use Cases

### Scenario 1: Enterprise Knowledge Transfer

**Background**: A company's senior UX designer is about to retire and needs to transfer 20 years of experience.

**Operation Flow**:

**Step 1: Create Expert**
```
Create "Senior UX Designer - Zhang Wei" Sage
Upload knowledge sources:
- Project documentation (50+ project design documents)
- Design guidelines (company design system v1-v3)
- Presentation slides (20+ slides from design sharing sessions)
- Design review records (meeting minutes from annual design reviews)
- Blog articles (100+ articles from designer's personal blog)
```

**Step 2: Build Knowledge Base**
```
AI processes and builds memory document:
• Extract expert biography: 20 years UX design experience, specializes in
                          B2B SaaS product design
• Identify expertise areas: Information architecture, interaction design,
                           user research, design systems
• Generate recommended questions: "How to design complex tables?",
                                 "B2B product navigation design", etc.
```

**Step 3: Discover Knowledge Gaps**
```
AI analysis identified 3 Knowledge Gaps:
• Gap 1: Missing latest AI tool usage experience (critical)
• Gap 2: Missing business thinking in design decisions (important)
• Gap 3: Missing cross-team collaboration experience summary (nice-to-have)
```

**Step 4: Supplementary Interview**
```
Create supplementary interview, designer answers:
Q: "How do you use latest tools like Figma AI to improve design efficiency?"
A: "I mainly use Figma AI for three things:
    1. Auto-generate component variants...
    2. Quickly fill placeholder content...
    3. Convert design to code..."

Q: "In design decisions, how do you balance user experience and business goals?"
A: "I have a decision framework:
    1. Clarify business goals (e.g., improve conversion rate)
    2. Identify user pain points (e.g., complex process)
    3. Find win-win solutions (simplify process while guiding conversion)..."

[Interview ends, knowledge base automatically updates]
```

**Step 5: New Employee Use**
```
New employee Li joins:
Li: "What are the best practices for our product table design?"

Sage (Zhang Wei): "Based on my 20 years of experience, B2B product table
                  design should follow these principles:

                  1. Clear information hierarchy
                     - Core data in dark color (gray-900)
                     - Secondary info in neutral gray (gray-600)
                     - Supporting info in light gray (gray-400)

                  2. Convenient operations
                     - Inline quick actions (show on hover)
                     - Bulk operations (header checkbox)
                     - Context menu (frequent operations)

                  3. Performance optimization
                     - Virtual scrolling (>100 rows of data)
                     - Lazy load images
                     - Front-end vs server-side pagination decision

                  I used this approach in projects X and Y with very
                  positive user feedback. Would you like me to explain
                  any part in detail?"

Li: (Received expert-level guidance without waiting for senior employee response)
```

**Value**:
- **Knowledge Permanently Saved**: After designer retires, knowledge remains accessible
- **Consult Anytime**: New employees not limited by senior staff availability
- **Continuous Evolution**: New employee questions continuously optimize Sage

---

### Scenario 2: Personal Learning Assistant

**Background**: University student Wang is studying machine learning with lots of course materials and notes.

**Operation Flow**:

**Step 1: Create Learning Assistant**
```
Create "Machine Learning Tutor" Sage
Upload knowledge sources:
- Course slides (professor's 40 lecture slides)
- Course notes (self-organized Markdown notes)
- Textbook PDF (Deep Learning Book by Goodfellow)
- Papers (classic papers like BERT, Transformer)
- Homework code (annotated Jupyter Notebooks)
```

**Step 2: Learning Process**
```
Wang: "How does the backpropagation algorithm work?"

Sage: "According to our course Lecture 5, backpropagation works like this:

      1. Forward propagation computes output
         y_pred = f(x; θ)

      2. Compute loss function
         L = loss(y_pred, y_true)

      3. Backpropagation computes gradients
         ∂L/∂θ = ∂L/∂y × ∂y/∂θ (chain rule)

      4. Update parameters
         θ_new = θ_old - α × ∂L/∂θ

      You already implemented this algorithm in homework 3 (see hw3_backprop.ipynb).
      Would you like me to explain any specific step?"

[After conversation ends, Sage analyzes asynchronously...]

New Knowledge Gap automatically created:
• Title: Numerical stability issues in backpropagation
• Description: Student asked about backpropagation but I didn't mention
             numerical stability (vanishing/exploding gradients)
• Source: conversation
```

**Step 3: Continuous Optimization**
```
Wang asks similar questions multiple times:
- "Why is my neural network not converging?"
- "What does gradient vanishing mean?"
- "How to choose activation functions?"

Sage discovers knowledge gaps:
• Gap: Neural network training techniques and hyperparameter tuning experience
• Source: conversation (discovered through multiple dialogues)

Wang creates supplementary interview:
Q: "What are common reasons for neural network training not converging?"
A: "1. Learning rate too large or small
    2. Poor initialization
    3. Vanishing/exploding gradients
    4. Data normalization issues..."

[Interview ends, knowledge base automatically updates]
```

**Value**:
- **Personalized Learning**: Based on own notes and understanding, not generic answers
- **Timely Q&A**: No need to wait for office hours, ask anytime
- **Fill Knowledge Gaps**: Sage proactively discovers learning blind spots and reminds to supplement

---

### Scenario 3: Industry Research Expert

**Background**: FinTech industry analyst needs to track industry dynamics and trends.

**Operation Flow**:

**Step 1: Create Industry Expert**
```
Create "FinTech Industry Expert" Sage
Upload knowledge sources:
- Industry reports (latest reports from McKinsey, iResearch, Gartner)
- Company announcements (financial reports and announcements from 10+ FinTech companies)
- Research papers (papers on blockchain, payments, digital currency)
- News articles (50+ articles from industry media)
```

**Step 2: Quick Insights**
```
Analyst: "What are the core trends in FinTech for 2025?"

Sage: "Based on 5 industry reports and 20+ company announcements I've
      integrated, there are 3 core FinTech trends for 2025:

      1. AI-driven risk control upgrades
         - Visa's Q4 report mentioned AI risk control system reduced
           fraud rate by 40%
         - PayPal launched LLM-driven anti-fraud engine
         - Trend: From rule engines → AI real-time decisions

      2. Embedded Finance explosion
         - Stripe's Embedded Finance business grew 120% YoY
         - Shopify, Uber and other platforms launched financial services
         - Trend: Financial services integrated into various scenarios

      3. Digital currency compliance
         - Multiple countries launched CBDC (central bank digital currency) pilots
         - Stablecoin regulatory policies gradually clarifying
         - Trend: From "gray area" → compliant operations

      Would you like me to dive deeper into any trend?"
```

**Step 3: Continuous Updates**
```
[1 week later, new industry report published]

Analyst adds new knowledge sources:
- Goldman Sachs FinTech Report 2025 Q2 (newly added)
- Ant Group Q2 Earnings Call (newly added)

Sage incremental processing:
→ Extract key insights from new report
→ Integrate with existing knowledge base
→ Automatically discover contradictions or supplements with previous reports
→ Create Memory Document v6

Analyst asks again:
"What new perspectives does Goldman Sachs' latest report have on AI risk control?"

Sage: "Goldman Sachs' Q2 report particularly emphasizes three points:

      1. AI risk control data quality issues...
      2. Model interpretability requirements...
      3. Importance of human-machine collaboration...

      This aligns highly with Visa and PayPal's practices I previously
      compiled, but Goldman Sachs particularly emphasizes regulatory
      compliance challenges..."
```

**Value**:
- **Quick Integration**: Automatically integrates multiple reports without manual extraction
- **Continuous Updates**: Immediately updates after new reports released, stays current
- **Discover Contradictions**: Automatically discovers viewpoint differences across reports

---

## Sage vs NotebookLM

| **Dimension** | **Sage** | **Google NotebookLM** |
|---------|---------|----------------------|
| **Core Positioning** | Evolving AI expert agent system | AI research assistant and knowledge management tool |
| **Core Value** | Build continuously learning professional AI advisors | Quickly understand and utilize existing documents |
| **Knowledge Management** | Versioned memory documents + proactive learning | Static analysis of uploaded content |
| **Learning Mechanism** | Actively identifies knowledge gaps and supplements via interviews | Passively responds to user queries |
| **Unique Features** | Knowledge Gap tracking, supplementary interviews, knowledge evolution | Audio Overview (docs to podcast), Deep Research |
| **Use Cases** | Professional consulting and knowledge transfer needs | Quickly digest large volumes of documents, learning research |
| **Cost Control** | Manual trigger processing, fine control | Google-hosted, low usage threshold |
| **Source Traceability** | Detailed knowledge change history and Gap sources | Citations to source document locations |
| **Knowledge Updates** | Version control, tracks every change | Re-upload documents to overwrite |
| **Interaction Mode** | Build expert → Identify gaps → Supplement knowledge → Provide consulting | Upload content → Immediate use → Generate different outputs |

### Core Differences

**Sage Emphasizes "Cultivating Experts"**:
- Knowledge is **dynamically evolving**
- System **proactively discovers** knowledge gaps
- Supplements knowledge through **structured interviews**
- **Complete knowledge evolution** tracking

**NotebookLM Emphasizes "Understanding Materials"**:
- Knowledge is **static** (based on uploaded documents)
- **Passively responds** to user queries
- **Innovative output formats** (podcasts, video summaries)
- **Quick onboarding**, low usage threshold

---

## Capability Boundaries

### ✅ What Sage Can Do

**1. Knowledge Import**
- ✅ PDF, TXT, Markdown, Audio, DOCX (up to 10 files)
- ✅ Text paste
- ✅ URL import (automatically fetch web content)

**2. Knowledge Management**
- ✅ Versioned memory documents (retain 20 versions)
- ✅ Knowledge source tracking
- ✅ Change history management

**3. Proactive Learning**
- ✅ Initial knowledge analysis (identify knowledge gaps)
- ✅ Discover knowledge gaps during conversations (asynchronous analysis)
- ✅ Supplementary interviews (AI automatically generates interview plans and questions)
- ✅ Automatically update knowledge base

**4. Expert Consulting**
- ✅ Public expert homepage
- ✅ AI-generated recommended questions
- ✅ Private conversations (visible only to owner)
- ✅ File attachment upload (as conversation context)

**5. Traceability**
- ✅ Complete knowledge source tracking
- ✅ Knowledge Gap lifecycle management
- ✅ Version control and change history

---

### ❌ What Sage Cannot Do

**1. Real-time Data**
- ❌ Does not support real-time data sources (e.g., real-time stock prices)
- ✅ Can periodically manually update knowledge sources

**2. Cross-expert Collaboration**
- ❌ Currently does not support multiple people jointly maintaining one expert
- ✅ Each user can create multiple independent experts

**3. Automated Updates**
- ❌ Will not automatically crawl latest information
- ✅ Incremental processing after user manually adds new knowledge sources

**4. Tool Invocation**
- ❌ Currently does not support web search, deep research, and other tools
- ✅ Planned for future support

---

## Best Practices

### 1. Create High-Quality Experts

**Provide Diverse Knowledge Sources**:
```
✅ Good Combination:
- Structured documents: Design specification PDF (clear rules)
- Case documents: Project design documents (practical experience)
- Thought summaries: Design blog articles (design thinking)
- Conversation records: Design review meeting minutes (real discussions)

❌ Poor Combination:
- Only upload specification documents (lacks practical cases)
- Only upload blog articles (lacks systematic knowledge)
```

**Content Depth Recommendations**:
- **Overview Level**: 10-20% (quickly understand the big picture)
- **Detailed Level**: 60-70% (deep professional knowledge)
- **Case Level**: 10-20% (real cases and decision processes)

---

### 2. Fully Utilize Supplementary Interviews

**Create Interviews Promptly**:
```
Trigger Conditions:
• 3+ pending Knowledge Gaps exist
• Critical-level Gap appears
• User repeatedly asks similar questions
```

**Interview Techniques**:
```
✅ Good Answer:
Q: "What is the minimum touch target size for mobile?"
A: "iOS and Android have different minimum touch target requirements:

    iOS (Apple HIG):
    - Minimum target: 44×44pt
    - Recommended target: 48×48pt (more generous)
    - Special scenarios: Dense lists can be appropriately reduced to 40pt

    Android (Material Design):
    - Minimum target: 48×48dp
    - Recommended target: 48×48dp (close to iOS)

    Our company's standard:
    - Consistently use 48×48pt/dp (compatible with both platforms)
    - Buttons themselves can be smaller, but target must be ≥ 48px"

❌ Poor Answer:
Q: "What is the minimum touch target size for mobile?"
A: "48px"
→ Too brief, lacks context and reasoning
```

---

### 3. Continuously Observe Conversation Quality

**Regularly Review Gaps Tab**:
```
Check Knowledge Gaps weekly:
1. Focus on conversation-type Gaps
   → Reflects real user needs
   → Prioritize resolution

2. View user question references
   → Understand why users ask this question
   → Assess Gap severity

3. Batch process related Gaps
   → Merge related domain Gaps to resolve in one interview
   → Improve efficiency
```

---

### 4. Cost Optimization

**Process Knowledge Sources in Batches**:
```
Batch 1: Core documents (30%)
→ Process → Observe results → Collect user feedback

Batch 2: Supplementary materials (40%)
→ Based on feedback, supplement weak areas

Batch 3: Cases and details (30%)
→ Refine expert capabilities
```

**Selective Interview Creation**:
```
Priority Ranking:
1. Critical-level Gaps (resolve immediately)
2. Important-level Gaps (resolve within 1 week)
3. Nice-to-have-level Gaps (low priority, can be deferred)

Merge Interviews:
• Merge related domain Gaps to resolve in one interview
• Reduce number of interviews, lower costs
```

---

## Technical Architecture

### Data Model

**Core Entity Relationships**:
```
Sage (1) ──< (N) SageSource         [Knowledge sources]
     (1) ──< (N) SageMemoryDocument  [Memory documents, versioned]
     (1) ──< (N) SageKnowledgeGap    [Knowledge gaps]
     (1) ──< (N) SageChat            [User conversations]
     (1) ──< (N) SageInterview       [Supplementary interviews]

SageKnowledgeGap ──> SageChat       [Optional association, conversation type]
SageKnowledgeGap ──> SageInterview  [Optional association, resolution method]
SageInterview ──> SageMemoryDocument [Creates new version]
```

**Memory Document Version Control**:
```typescript
{
  version: number,          // Auto-incrementing version number
  content: string,          // Memory document in Markdown format
  source: "initial" | "interview" | "manual",
  description: string,      // Change description
  createdAt: DateTime,
}
```

**Knowledge Gap Traceability**:
```typescript
{
  title: string,
  description: string,
  severity: "critical" | "important" | "nice-to-have",
  status: "pending" | "resolved",
  source: {
    type: "analysis" | "conversation" | "system_suggestion",
    chatId?: number,        // Associated conversation for conversation type
  },
  resolvedBy?: {
    type: "interview" | "manual",
    interviewId?: number,   // Associated interview for interview type
  },
}
```

---

### AI Model Strategy

| **Task** | **Model** | **Reason** |
|---------|---------|---------|
| Expert profile generation | Claude Sonnet 4.5 | High-quality text generation |
| Memory document building | Claude Sonnet 4.5 | Structured knowledge organization |
| Knowledge gap analysis | GPT-4o | Quickly identify knowledge blind spots |
| Expert conversation | Claude Sonnet 4.5 | High-quality interaction experience |
| Supplementary interview | Claude Sonnet 4.5 | Deep conversation capability |
| Conversation quality analysis | Gemini 2.5 Flash | Low-cost asynchronous analysis |
| Interview plan generation | Claude Sonnet 4 | Structured plan generation |

**Cost Optimization Design**:
1. **Manual Trigger**: All three processing steps require manual user trigger, avoiding unexpected consumption
2. **Asynchronous Processing**: Conversation quality analysis and post-interview updates use background asynchronous processing
3. **Lightweight Models**: Non-critical tasks use lower-cost models (Gemini 2.5 Flash)
4. **Incremental Updates**: Supports incremental processing after adding new knowledge sources

---

## Future Outlook

### Near-term Improvements (within 3 months)

1. **Version History UI**
   - Visualize version history
   - Compare differences between versions
   - Rollback to historical versions

2. **Real-time Processing Progress**
   - WebSocket/SSE real-time updates
   - Processing progress bars
   - Detailed processing logs

3. **Expert Public/Private Control**
   - Choose whether to publish expert homepage
   - Set access permissions
   - Share expert with team members

### Mid-term Improvements (within 6 months)

1. **Tool Invocation Support**
   - web search (real-time search for latest information)
   - deep research (deep research capability)
   - Custom MCP tools

2. **Expert Collaboration**
   - Multiple people jointly maintain one expert
   - Permission management (owner/editor/viewer)
   - Change review process

3. **Knowledge Base Export**
   - Export memory documents (Markdown/PDF)
   - Export complete knowledge base (JSON)
   - Migrate to other systems

---

## Summary

**Sage Evolving Expert System** is an innovative feature of atypica.AI that achieves continuous evolution of AI experts through three key mechanisms: **memory documents, knowledge gap tracking, and supplementary interviews**.

### Core Value

1. **Continuous Evolution**: Every conversation and interview makes the expert stronger
2. **Proactive Learning**: System proactively discovers knowledge gaps and supplements them
3. **Knowledge Transfer**: Make tacit knowledge explicit, permanently preserving expert experience
4. **Traceability**: Complete knowledge source and change history

### Use Cases

✅ **Suitable For**:
- Enterprise knowledge transfer (senior employee experience transfer)
- Personal learning assistant (course note organization)
- Industry research expert (continuously track industry dynamics)
- Professional consulting (law, medicine, technology, and other fields)

❌ **Not Suitable For**:
- Real-time data queries (e.g., stock prices)
- General Q&A (ChatGPT is more suitable)
- One-time document understanding (NotebookLM is faster)

### Relationship with Other Features

```
Plan Mode (intent clarification layer)
    ↓
Reference Research + File Attachments (background loading)
    ↓
MCP Integration (tool extension)
    ↓
Sage Evolving Expert System (expert cultivation) ← You are here
    ↓
Memory System (persistent memory)
```

**Feature Synergy**:
- **File Attachments**: Upload files to conversation vs upload to Sage knowledge base, complementary
- **Memory System**: User-level memory vs expert-level memory, dual-layer architecture
- **MCP Integration**: Sage can call MCP tools in the future, expanding expert capabilities

---

**Related Documentation**:
- [Reference Research + File Attachments](./reference-attachments.md) - Learn how to upload materials
- [Memory System Mechanism](./memory-system.md) - Learn about user-level persistent memory
- [MCP Integration Capabilities](./mcp-integration.md) - Learn about tool extensions
- [NotebookLM vs Sage](https://notebooklm.google/) - Compare with Google's solution
