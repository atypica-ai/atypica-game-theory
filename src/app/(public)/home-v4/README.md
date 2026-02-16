# Home-V4: Design Principles vs Product Copy

## Product Copy (WHAT Atypica IS — never change without user approval)

### Tagline
**"The Agent That Understands Humans"**
- "Understands" is styled in italic green (InstrumentSerif)
- "Humans" is in normal white text
- This is the PRODUCT tagline. It describes what Atypica does.

### Hero Subtitle
- **zh**: 大多数 Agent 只有一种使命——替人干活。我们认为 Agent 还有第二种形态——理解人。在商业世界里，理解人，比替人做事更难，也更值钱。
- **en**: Most agents do tasks. Atypica does something harder — it models why people choose, hesitate, and decide.

### Manifesto (对偶)
- **zh**: 物理学为客观世界建模。 / Atypica 为主观世界建模。
- **en**: Physics models the objective world. / Atypica models the subjective one.

### Core Thesis
- **zh**: 一个「理解人」的 Agent 系统
- **en**: An Agent System That Understands People
- Two roles: 模拟者 AI Simulator + 倾听者 AI Researcher

### Core Technology
- **主观世界模型 / Subjective World Model (SWM)**
- Six nodes: 价值体系, 风险偏好, 情绪触发点, 决策路径, 社会影响因素, 认知框架
- 基础模型备案进行中

### Product Modes (四种理解方式)
1. **Proactive** — 主动模式 (always-on signal absorption)
2. **Auto** — 自动模式 (end-to-end AI research, weeks → minutes)
3. **Human** — 人机模式 (AI-led deep interviews)
4. **Model** — 主观模型 (virtual sample systems)

### Subjective Model (样本系统)
- **AI Persona** — 虚拟消费者样本库 (1,000,000+ AI · 70,000+ Human)
- **AI Sage** — 虚拟专家样本库 (Industry · Academic · Advisory)
- **AI Panel** — 新一代智能调研 Panel (Simulate · Compare · Scale)

### Interaction Modes
- 多元理解 × 多模态
- Methods: 一对一访谈, 一对多访谈, 多人讨论, 专家访谈, 行为观察
- Modalities: 文字, 图像, 视频, 网页, 声音

### Use Cases (9 scenarios)
1. 市场研究与消费者洞察
2. 产品概念测试与创新研究
3. 品牌策略与传播洞察
4. 归因分析
5. 定价策略与商业模式设计
6. 社媒舆情与趋势情报
7. 用户体验和 VOC
8. 学术社会科学研究
9. 预测投资和市场判断

### Client List (标杆客户)
Mars, Bosch, Lenovo, Fonterra, Ant Group, Huawei, L'Oréal, WPP, Proya

### CTA
- **en**: Ready to Understand Your Users?
- **zh subtitle**: 让 Agent 帮你理解每一个消费者的主观世界。比替人干活更难的事，我们已经开始了。

---

## Design Principles (HOW it LOOKS — visual aesthetic only)

### Core Philosophy
**"Less AI, more intelligence." / "越不AI越AI"**
- This is the DESIGN philosophy. It is NOT product copy.
- It should NEVER appear on the homepage as visible text.
- It guides visual decisions: retro-futurism, warm, bright, human.

### Visual Direction: Retro-Futurism
- 1970s Braun industrial design (Dieter Rams)
- Early Apple simplicity
- Vintage scientific instruments (oscilloscopes, chart recorders)
- Mid-century modern warmth (brass, wood, craftsmanship)

### NOT This
- Cyberpunk, vaporwave, steampunk
- Neon gradients, floating 3D, particle effects
- Dark-only aesthetic, holographic displays

### Color System
- **Brand green**: `#2d8a4e` (forest green, used sparingly)
- **Light accent**: `#4ade80` (on dark backgrounds)
- **Backgrounds**: Mixed light/dark per section purpose
  - Hero/CTA: `#0a0a0c` (dark, immersive)
  - CoreTech: `#1a1a1a` (dark, orbit diagram)
  - Content sections: `#fafaf8` (warm white, airy)

### Image Strategy
- Abstract, not photographic
- Structured long-form prompts for nano-banana (NOT keyword lists)
- Each prompt: subject + style ref + colors + lighting + mood + exclusions
- See `docs/design/aesthetic-guidelines-en.md` for full prompt guide

### Typography
- **EuclidCircularA** — headings and body
- **IBMPlexMono** — labels, tags, data
- **InstrumentSerif** (italic) — accent words in hero

### Grain Overlay
- SVG feTurbulence: frequency 0.7, octaves 3, opacity 0.03
- mix-blend-multiply, overall 20% opacity
- Creates warm analog film feeling

---

## Reference Files
- **Canonical product copy**: The HTML mockup provided by the user (see conversation history)
- **Design guidelines**: `docs/design/aesthetic-guidelines-en.md` / `aesthetic-guidelines-zh.md`
- **i18n**: `src/app/(public)/messages/en-US.json` and `zh-CN.json` (HomePageV4 section)
