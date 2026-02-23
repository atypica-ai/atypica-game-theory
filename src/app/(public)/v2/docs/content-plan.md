# V4-3 内容规划（英文文案）

## 页面结构总览

```
Hero        — The Agent That Understands Humans + social proof badges
01 TWO WORLDS    — Kahneman 引言 + 客观vs主观
02 TWO AGENTS    — Simulator(Persona/Sage) + Researcher(5种研究方式)
03 WORLD MODEL   — 四层模型 + 6维度环形图
04 THREE MODES   — Signal / Deep / Live
05 DATA ASSETS   — AI Persona / AI Sage / AI Panel
06 USE CASES     — 商业场景表格 + 4个客户故事
Closing          — CTA + 客户列表
```

---

## Hero

**Kicker badge**: ATYPICA 2.0
**Title**: The Agent That _Understands_ Humans
**Body**: Most agents do tasks. Atypica does something harder — it models why people choose, hesitate, and decide.
**CTA Primary**: Start a Study →
**CTA Secondary**: How It Works
**Social proof badges**: 1M+ AI Personas · 85% Behavioral Accuracy · 9 Enterprise Clients
**背景**: AI生成抽象图（深色多面体+绿色粒子流）

---

## 01 TWO WORLDS

**Kicker**: THE CORE PROBLEM
**Title**: "We don't react to reality. We react to the model inside our heads."
**Attribution**: — Daniel Kahneman
**Body**: The objective world can be measured. The subjective world — emotions, values, hesitations — must be modeled. Most AI agents work in the objective world, doing tasks for you. Atypica is the other kind: it simulates the subjective world to understand people.

**交互元素**: 左右对比卡片
- 左: [2.A] OBJECTIVE WORLD — "Measurable. Quantifiable. The domain of traditional AI agents — automating tasks, processing data, executing workflows."
- 右: [2.B] SUBJECTIVE WORLD — "Emotional. Contextual. The domain of human decisions — why people choose, hesitate, trust, and act."

---

## 02 TWO AGENTS

**Kicker**: CORE ARCHITECTURE
**Title**: Simulate × Research
**Body**: The Simulator becomes a specific person — reconstructing how they choose, why they hesitate, what tips the balance. The Researcher asks the right questions, probes deeper, draws out what people struggle to articulate.

**左卡片 — AI Simulator**:
- Tag: AI SIMULATOR
- Title: Persona + Sage
- Description: The Simulator becomes a specific person — not a statistical average. It reconstructs how they choose, why they hesitate, and what tips the balance.
- 子卡片:
  - AI Persona — 2C Consumer Simulation: Virtual consumers built from real behavioral data. Each carries unique values, risk profiles, and decision logic.
  - AI Sage — 2B Expert Simulation: Domain experts with two-layer memory — core knowledge and working knowledge that grows through every consultation.
- 配图: Persona卡片UI mockup + Sage知识层mockup (CSS/SVG)

**右卡片 — AI Researcher**:
- Tag: AI RESEARCHER
- Title: Five Research Methods
- Description: The Researcher asks the right questions, probes deeper, draws out what people struggle to articulate. Part interviewer, part analyst — always listening.
- 方法列表:
  1. 1-on-1 Interview
  2. One-to-Many
  3. Focus Group
  4. Panel Discussion
  5. Behavioral Observation
- 配图: Interview对话UI mockup (CSS/SVG)

---

## 03 WORLD MODEL

**Kicker**: FOUNDATION
**Title**: Subjective World Model
**Body**: Four layers of understanding, from surface expression to deep behavior. Six dimensions that define any person's decision-making world.

**交互元素 — 环形图**:
- 4层同心环（从外到内）:
  - Expression (r=42) — "How people express themselves" → Scout Agent
  - Story (r=33) — "How people explain themselves" → Interview System
  - Cognition (r=24) — "How people make decisions" → World Model Core
  - Behavior (r=15) — "How people actually act" → Use Cases & Validation
- 6维度辐射节点（位于最外环外侧）:
  - Value Systems — "What matters and why"
  - Risk Preferences — "How people weigh uncertainty"
  - Emotional Triggers — "What moves people to act"
  - Decision Pathways — "How choices actually get made"
  - Social Influence — "The invisible pull of others"
  - Cognitive Frames — "Mental models that shape perception"
- 中心: SWM 核心脉冲
- 右侧面板: 显示当前hover的维度/层级详情 + 层级列表

---

## 04 THREE MODES

**Kicker**: PRODUCT
**Title**: Three Ways to Understand
**Body**: From autonomous signal absorption to full-auto research to live human-AI dialogue.

**三列卡片**（每个可点击跳转 /newstudy）:

**Signal Mode** (accent: #4ade80):
- Badge: SIGNAL
- Description: Always-on intelligence. The agent continuously absorbs signals from social media, surfaces trends, and delivers findings without being asked.
- Mockup: 趋势线SVG图（模拟社媒信号流）
- → /newstudy

**Deep Mode** (accent: #93c5fd):
- Badge: DEEP
- Description: End-to-end AI research — from study design to interviews to insight delivery. Weeks of work compressed into minutes.
- Mockup: 流水线阶段图（Plan → Interview → Analyze → Report）
- → /newstudy

**Live Mode** (accent: #f59e0b):
- Badge: LIVE
- Description: AI Researcher leads deep interviews with real people or virtual personas. Conversations become structured insights.
- Mockup: 对话界面 mockup
- → /newstudy

---

## 05 DATA ASSETS

**Kicker**: ASSETS
**Title**: Virtual Sample Infrastructure
**Body**: Three types of AI-powered research assets, built on real behavioral data and social science models.

> 注意：这个章节用暖白背景 (#fafaf8)，文字用深色

**三列卡片**:

**AI Persona** (accent: #4ade80):
- Description: Virtual consumers built from real behavioral data and social science models. Callable, verifiable, always consistent.
- Stats: AI Samples: 1,000,000+ / Human Baselines: 70,000+ / Accuracy: 85% / Tier System: 0–3
- Mockup: 人物卡片UI（头像圆圈+标签）

**AI Sage** (accent: #93c5fd):
- Description: Domain experts with two-layer memory architecture. Core knowledge stays stable; working knowledge grows through every consultation.
- Stats: Industries: Healthcare, Finance, CPG, Tech / Cost Reduction: ~85% / Memory: Core + Working / Knowledge Gaps: Auto-detected
- Mockup: 知识层级UI（Core Memory + Working Memory）

**AI Panel** (accent: #f59e0b):
- Description: Next-gen research panels combining AI samples with real respondents. Simulate, compare, and scale.
- Stats: Panel Size: 3–8 personas / Modes: Focus, Debate, Roundtable / Calibration: Real respondents / Output: Summary + Minutes
- Mockup: 多人讨论UI（多个头像圆点+消息）

---

## 06 USE CASES

**Kicker**: APPLICATION
**Title**: Every Scenario Where Understanding People Matters

> 同样暖白背景

**商业场景表格**:

| Scenario | Core Tools | Agent |
|----------|-----------|-------|
| Consumer Insight & U&A | Scout + Interview + Persona | Study Agent |
| Concept Testing | PersonaImport + Interview + Panel | Study Agent |
| Brand Strategy | Social Trends + Report | Product R&D |
| Attribution Analysis | Interview + Reasoning + Report | Study Agent |
| Pricing Strategy | Interview (WTP) + Panel | Study Agent |
| Social Listening | Scout (5 platforms) + Trends | Product R&D |
| User Experience & VOC | Scout + Interview + Report | Study Agent |
| Sales Training | PersonaImport + Persona Chat | Direct Use |
| Academic Research | Scout + Persona + Panel | Study Agent |
| Market Intelligence | MCP + Trends + Reasoning | Fast Insight |

**4个客户故事**（2×2网格）:

1. **Global Food Brand**: 20+ concepts × 5 markets in 2 weeks → AI Persona + Panel → 80% cost reduction, 6x faster
2. **Industrial Tools Manufacturer**: Professional users hard to recruit → Tier 3 AI Personas → Always-on virtual user panel
3. **University Research Team**: 20,000 household survey → Scout + Persona + Panel → Policy simulation in days
4. **Prediction Market Platform**: Real-time sentiment model → MCP integration → Continuous sentiment signals

---

## Closing

**客户列表** (fin.ai-style横排):
Mars · Bosch · Lenovo · Fonterra · Ant Group · Huawei · L'Oréal · WPP · Proya
（每个名字在独立的border框内，灰白色，统一大小）

**CTA**:
- Title: Ready to Understand Your Users?
- Body: Let agents model every consumer's subjective world. The harder problem — we've already started.
- Primary CTA: Request a Demo →
- Secondary CTA: Read Documentation
