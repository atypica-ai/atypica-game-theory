# GEA：从 atypica 的实践看企业 AI 系统的构建

**一个消费者研究平台的架构演进**

---

## 背景

我们在做 atypica，一个 AI 驱动的消费者研究平台。

目标很简单：让 AI 能独立完成用户研究——从观察社交媒体、到模拟访谈、到生成洞察报告。

过程中遇到了一些具体问题，也做了一些尝试。这篇文章记录这个过程，以及我们提炼出的一套架构思路（GEA - Generative Enterprise Architecture）。

---

## 遇到的问题

### 问题1：用户的需求很模糊

用户常说："想了解年轻人对咖啡的偏好"

但这不够具体：

- 哪个年龄段的年轻人？
- 关注哪些维度？价格？品牌？场景？
- 用什么方法？观察？访谈？问卷？
- 产出什么？用户画像？策略建议？

**传统做法**：多轮对话澄清需求
→ 问题：每次都要重新问，无法复用

**我们的尝试**：

不把它当"需求澄清"，而是"意图构建"——从用户输入、团队历史、已有 Persona 中直接组装一个可执行的研究意图。

### 问题2：Context 很难管理

做一次研究会产生大量 Context：

- 社交媒体观察结果（几百条内容）
- 用户画像（Persona）
- 历史研究模板
- 中间推理过程

这些 Context：

- 有些是长期的（Persona 库）
- 有些是临时的（当前对话）
- 需要被过滤（噪音很多）
- 需要被关联（相似研究能被找到）

**传统做法**：RAG 检索
→ 问题：检索只是第一步，还需要持续整理

**我们的尝试**：

把 Context 当作一个系统来管理——有点像做 DAM（Digital Asset Management）时的思路：让对的资产在对的时间可用。

### 问题3：Agent 需要持续调整方向

做研究不是线性流程：

- 观察 → 发现矛盾信号 → 需要深度访谈
- 某个数据源无效 → 需要换方向
- 洞察已经清晰 → 应该停止探索

这需要一个 Agent 持续做判断，而不是按预设流程执行。

**传统做法**：Multi-Agent 各司其职
→ 问题：谁来做这个"持续判断"的角色？

**我们的尝试**：

分成两个 Agent：

- **Reasoning Agent**：做判断和决策
- **Execute Agent**：执行具体任务

Reasoning Agent 负责准备 Context、判断下一步、调整方向。

### 问题4：经验难以复用

每次研究都会积累经验：

- 某个领域的用户画像
- 某个平台的观察方法
- 某种问题的访谈框架

这些经验如果不沉淀，下次又要从头开始。

**传统做法**：文档或工具调用
→ 问题：文档不够结构化，工具调用不够灵活

**我们的尝试**：

把经验代码化为 Skills——可以被动态加载的能力模块。

---

## atypica 的工作流程

以一个典型的研究任务为例："想了解年轻人对咖啡的偏好"

### 完整流程概览

**Step 1: Intent 构建**

从 Memory（团队关注视觉）、Assets（茶饮研究）组装意图。

**Step 2: Reasoning 规划**

路径：观察 → 访谈 → 报告
准备：加载 scoutTask Skill、准备社交媒体 MCP

**Step 3: Execute 观察**

按 scoutTask 方法观察小红书/抖音，收集 120+ 条内容。
发现："说重视性价比，但为高颜值付费"

**Step 4: Reasoning 调整**

发现矛盾 → 加载 interview Skill → 深度访谈验证

**Step 5: Execute 访谈**

```
Q: "你最看重什么？" → "性价比"
Q: "但你晒的38元咖啡..." → "杯子太好看了"
Q: "所以好看也是性价比？" → "可以发朋友圈"
```

洞察：Z世代"性价比" = 功能+视觉+社交

**Step 6: 生成报告**

加载 reportGen Skill，输出细分、洞察、建议。

**Step 7: 沉淀**

Memory 学习、Assets 新增、Skills 优化。下次更高效。

### 详细步骤展开

#### 1. Intent 构建

系统不会让你填表或多轮对话澄清。它直接从你的问题、团队历史、现有 Persona 库中构建一个可执行的研究意图：

```
对象: 18-28岁一线城市年轻人
场景: 日常咖啡消费决策
维度: 品牌偏好、价格敏感度、社交因素
方法: 社交媒体观察 + 模拟访谈
产出: 用户细分 + 偏好地图
```

#### 2. Reasoning Agent 开始推理

推理 Agent 规划执行路径，准备 Context：

- 加载 scoutTaskChat skill（社交媒体观察）
- 准备 system prompt 和相关 tools
- 从 Persona 库检索相关用户画像
- 设置推理触发条件（5次观察后深度分析）

#### 3. Execute Agent 执行

执行 Agent 根据准备好的 Context 工作：

- Scout 在小红书/抖音观察用户讨论
- 收集 120+ 条内容，识别关键模式
- 触发 reasoningThinking 深度分析
- 发现洞察："价格敏感 + 视觉导向，但为颜值付费"

#### 4. Context 持续整理

推理 Agent 根据执行结果调整策略：

- 矛盾信号？加载 interview skill，深度访谈验证
- 信息不足？调整 scout 观察维度
- 洞察清晰？加载 reportGen skill，生成报告

整个过程中，Context 不断被过滤、提炼、重组。

#### 5. 资产沉淀

研究完成后，新资产进入 DAM 系统：

- 新 Persona 自动入库（Z世代咖啡消费者画像）
- 研究意图模板化（可复用于茶饮、奶茶研究）
- Knowledge Gaps 记录（微博该人群讨论少）

下次类似研究，系统更聪明。

---

## 形成的架构：GEA

针对这些问题，我们的架构逐渐形成了四个核心部分：

### 架构图

```
  ┌──────────────────────────────────────────────────────────┐
  │                   GEA Architecture                       │
  ├───────────┬──────────────────────┬───────────────────────┤
  │           │                      │                       │
  │ External  │   Core Process       │  Context System (DAM) │
  │ Infra     │                      │                       │
  │           │   Intent Layer       │  • Memory             │
  │ • LLM     │   (需求+Context)      │    (团队记忆)          │
  │           │        ↓             │                       │
  │ • MCP     │   Reasoning ←──────→ │  • Assets             │
  │   社交媒体 │        ↓             │    (企业数据)          │
  │   市场报告 │   Execute   ←──────→ │    财报/产品/内容       │
  │   CRM数据 │        ↓             │                       │
  │           │   Outcome            │  • Skills             │
  │ • APIs    │                      │    (方法论)            │
  │           │                      │    研究框架/访谈方式    │
  │           │                      │                       │
  └───────────┴──────────────────────┴───────────────────────┘
```

**左侧：外部基础设施**

- LLM（GPT-4、Claude 等）
- MCP Servers（社交媒体数据、市场报告、CRM 数据）
- APIs

**中间：核心流程**

- Intent Layer：需求 + Context → 可执行意图
- Reasoning Agent：持续推理决策
- Execute Agent：执行任务
- Outcome：交付结果

**右侧：Context System（DAM）**

- Memory：团队记忆（工作风格、判断标准）
- Assets：企业数据（财报、产品信息、内容、历史研究）
- Skills：方法论（研究框架、访谈方式）

Reasoning 和 Execute 持续与 Context System 交互：获取记忆、访问数据、加载方法。

### 1. Intent Layer（意图层）

**作用**：把模糊输入变成可执行意图

**具体做法**：

- 解析用户输入
- 匹配团队历史（类似研究、相关 Persona）
- 生成结构化的研究意图

**产出**：一个包含研究对象、方法、产出的明确意图

### 2. Context System（上下文系统）

**作用**：管理各种 Context 资产

**两个维度**：

- **Build Time**：长期资产（Persona 库、研究模板、Skills）
- **Runtime**：会话 Context（对话历史、观察结果、推理记录）

**核心能力**：

- 语义索引（不只是关键词）
- 动态过滤（去噪）
- 关联推荐（找相关资产）

### 3. Reasoning Agent（推理引擎）

**作用**：持续推理和决策

**具体工作**：

- 规划执行路径
- 准备 Context（为 Execute Agent 准备 prompts、tools、skills）
- 判断何时调整方向
- 决定何时停止

**不做什么**：不直接执行任务（交给 Execute Agent）

#### 双 Agent 架构对比

```
Multi-Agent Architecture       Dual-Agent Architecture
(Traditional)                   (GEA / atypica)

┌───────────┐                   ┌───────────────────┐
│Scout Agent│                   │ Reasoning Agent   │
└─────┬─────┘                   │ (Inference/Plan)  │
      │                         └────────┬──────────┘
┌─────▼──────┐                           │ Prepare Context
│Interview   │                           │ Instruct Exec
│Agent       │                  ┌────────▼──────────┐
└─────┬──────┘                  │ Execute Agent     │
      │                         │   (Universal)     │
┌─────▼──────┐                  └────────┬──────────┘
│Report Agent│                           │
└─────┬──────┘                  ┌────────▼──────────┐
      │                         │   Skills Lib      │
┌─────▼──────┐                  │  • scoutTask      │
│Strategy    │                  │  • interview      │
│Agent       │                  │  • reportGen      │
└────────────┘                  │  • strategy       │
                                └───────────────────┘

Issues:                         Benefits:
• Fragmented context          • Unified context mgmt
• High coordination cost      • Clear reasoning path
• Hard to reuse               • Composable skills
```

### 4. Execute Agent + Skills

**Execute Agent**：

- 足够通用的执行器
- 完全依赖 Reasoning Agent 准备的 Context
- 动态加载 Skills

**Skills**（atypica 的具体 Skills）：

- scoutTaskChat：社交媒体观察
- interviewChat：用户访谈
- buildPersona：生成用户画像
- reportGen：生成报告

#### Skills 渐进披露

```
Skills Progressive Disclosure
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Load time (metadata only):
┌─────────────────────────────────────┐
│ Skills Library (1000+ skills)       │
│                                     │
│ scout.md          - Social observe  │
│ interview.md      - Structured Q&A  │
│ reportGen.md      - Report builder  │
│ ...                                 │
└─────────────────────────────────────┘
         ↓ Minimal token usage

Runtime (load on demand):
┌─────────────────────────────────────┐
│ Reasoning: "Need social observation"│
└──────────────┬──────────────────────┘
               ↓ Load scout.md
┌──────────────▼──────────────────────┐
│ ## Scout Skill                      │
│                                     │
│ Observe social media behavior...    │
│ - Collect 5 samples                 │
│ - Identify patterns                 │
│ - Trigger reasoningThinking         │
│                                     │
│ [scripts/scout.py]                  │
└─────────────────────────────────────┘

After completion:
Context reorganized, skill unloaded
```

只在需要时加载完整内容，避免 Context 臃肿。

#### 关于 Skills 概念的来源

"Universal Agent + Skills Library" 的理念来自 Anthropic 在 2025 年的思考——不是构建多个专用 Agent，而是一个通用 Agent 配合可组合的 Skills。我们认同这个方向。

在 atypica 的实践中，我们结合双 Agent 架构来使用 Skills，并在消费者研究场景做了具体应用。

---

## 和其他架构的关系

GEA 不是替代 RAG 或 Multi-Agent，而是在特定场景的一种实践。

### 和 RAG 的关系

Context System 用到 RAG 的检索能力。

但增加了持续整理和资产管理——不只是检索，还要过滤噪音、建立关联、及时更新。

### 和 Multi-Agent 的关系

也有多个能力单元（Skills）。

但用双 Agent 分离推理和执行，Skills 作为 Context 动态加载——不是固定的多个 Agent，而是可组合的能力模块。

---

## 开放的问题

还有一些问题我们也在探索：

### 1. Intent 的自动构建到什么程度？

现在还需要一些人工确认。未来能否完全自动？

### 2. Context 的整理策略？

什么时候保留？什么时候丢弃？如何平衡质量和数量？

### 3. Skills 的粒度？

太细碎了管理成本高，太粗糙了不够灵活。

### 4. 这套架构能迁移到其他领域吗？

我们只在消费者研究验证过。其他判断型工作可能需要调整。

---

## GEA 的适用边界

GEA 不是通用架构，是**特定场景的原生架构**。

### ✓ 适合探索型知识工作

- 市场研究和用户洞察
- 产品定义和策略规划
- 内容策划和创意探索
- 技术方案评估和决策

**特征**：起点模糊、过程不确定、核心是判断

### ✗ 不适合确定性任务

- 重复性流程自动化
- 强约束的审批流程
- 实时性要求的操作
- 明确SOP的执行任务

**特征**：流程固定、要求确定、重在执行

---

> GEA 是为"无法写成 SOP 的工作"设计的架构。如果你的工作可以写成明确流程，用传统工作流引擎可能更合适。

---

© 2025 atypica.AI - Pioneering Generative Enterprise Architecture
