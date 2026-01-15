# Sage 可进化专家系统

**一句话总结**：可进化的专家智能体系统，从文档/对话中提取知识，构建专家大脑，自动发现知识缺口并通过访谈填补，持续成长。

---

## 核心对比：Sage 专家 vs AI Persona vs 普通 AI

| 维度 | Sage 可进化专家 | AI Persona (Tier2/3) | 普通 AI 助手 |
|------|--------------|---------------------|------------|
| **知识来源** | 用户上传的文档+访谈补充 | Scout 观察+深度访谈 | 预训练模型 |
| **知识类型** | 领域专家知识（深度） | 真人消费者行为（广度） | 通用知识 |
| **使用场景** | 专业咨询、知识管理 | 市场研究、用户访谈 | 日常对话 |
| **可进化性** | ✅ 自动发现缺口+访谈补充 | ❌ 静态画像，不进化 | ❌ 模型固定 |
| **记忆架构** | Core Memory (Markdown) + Working Memory (JSON) | 单层画像数据 | 对话历史 |
| **版本管理** | ✅ 支持版本历史追溯 | ❌ 无版本 | ❌ 无版本 |
| **知识组织** | 结构化记忆文档（类似 CLAUDE.md） | 7 维度评分 | 无组织 |
| **边界清晰** | ✅ 明确知道/不知道 | ⚠️ 模拟真人，有边界 | ❌ 倾向于回答所有问题 |
| **创建方式** | 上传文档 → 自动提取 | Scout 观察 / Persona Import | N/A |
| **典型用例** | 公司内部专家库、个人知识管家 | 消费者研究、目标客群模拟 | 通用助手 |

---

## 核心概念

### 1. Sage 是什么？

**Sage** 是一个可以持续成长的专家智能体系统，类似于拥有"大脑"的 AI 专家：

- **Core Memory（核心记忆）**：专家的稳定知识基础，结构化 Markdown 文档（类似 Claude Code 的 CLAUDE.md）
- **Working Memory（工作记忆）**：最近通过访谈或对话补充的新知识，JSON 格式待整合内容
- **Knowledge Gaps（知识缺口）**：自动发现专家不知道的领域，触发补充访谈
- **Sources（知识源）**：用户上传的文档、文件、URL，是专家知识的原始材料

**类比**：
- Sage = 你公司里的资深专家
- Core Memory = 专家的专业知识体系（结构化笔记）
- Working Memory = 专家最近学到的新知识（待整理）
- Knowledge Gaps = 专家承认"这个我不太懂"
- Sources = 专家读过的书、论文、培训材料

### 2. 双层记忆架构

```typescript
// prisma/schema.prisma:742-759
model SageMemoryDocument {
  id      Int  @id
  sageId  Int
  sage    Sage @relation(...)
  version Int

  core    String @default("") @db.Text    // 核心记忆 (Markdown)
  working Json   @default("[]")           // 工作记忆 (来自访谈的待整合知识)

  changeNotes String @db.Text
  extra       Json   @default("{}")

  createdAt DateTime
  updatedAt DateTime

  @@unique([sageId, version])
  @@index([sageId, version(sort: Desc)])  // 优化查询最新版本
}
```

**Core Memory 结构**（Markdown 格式）：
```markdown
# Expert Profile
- Name: [专家名称]
- Domain: [专业领域]
- Expertise: [专长列表]
- Language: [主要语言]

# Core Knowledge

## Topic 1: [主题名称]
### Key Points
- [详细知识点，包含上下文]

### Insights
- [深度见解和分析]

### Experience
- [实践经验和具体案例]

## Topic 2: [另一个主题]
...

# Conversation Style
- Tone: [正式/随意/技术]
- Approach: [分析型/共情型/直接型]
- Signature phrases: [常用表达]

# Knowledge Boundaries
- Current strengths: [擅长的领域]
- Known limitations: [专家不知道的内容]
- Learning areas: [需要扩展的主题]
```

**Working Memory 结构**（JSON 格式）：
```typescript
type WorkingMemoryItem = {
  knowledge: string;              // 新知识内容
  sourceChat: {                   // 来源对话
    id: number;
    token: string;
  };
  timestamp: string;              // 添加时间
};
```

**设计哲学**：
- **Core Memory**：人类可读，AI 友好，像专家的结构化笔记本
- **Working Memory**：临时存储，待整合到 Core Memory
- **版本管理**：每次更新创建新版本，可追溯历史

---

## 完整生命周期

### Phase 1: 创建专家（Extract Knowledge from Sources）

#### 1.1 用户上传 Sources

```typescript
// prisma/schema.prisma:685-696
model SageSource {
  id            Int    @id
  sageId        Int
  sage          Sage   @relation(...)
  content       Json   // { type:"text", text } or { type:"file", objectUrl, name, mimeType, size } or { type:"url", url }
  title         String @db.VarChar(255)
  extractedText String @db.Text
  extra         Json   @default("{}")

  createdAt DateTime
  updatedAt DateTime
}
```

**支持的 Source 类型**：
- **text**: 用户直接粘贴的文本
- **file**: 上传的文件（PDF, Word, Markdown, etc.）
- **url**: 网页链接

#### 1.2 自动提取知识（2-Step Process）

```typescript
// src/app/(sage)/processing/memory.ts:26-107
export async function extractKnowledgeFromSources({
  sageId, locale, logger, statReport, abortSignal
}): Promise<void> {
  // Step 1 & 2 并行执行
  const [, coreMemory] = await Promise.all([
    // Step 1: 生成专家档案
    extractKnowledge_1_buildSageProfile({ sage, sageSources, ... })
      .then(async ({ categories, bio, recommendedQuestions }) => {
        await prisma.sage.update({
          where: { id: sageId },
          data: { expertise: categories, bio },
        });
      }),

    // Step 2: 构建核心记忆文档
    extractKnowledge_2_buildSageCoreMemory({ sage, sageSources, ... }),
  ]);

  // 保存为 Memory Document 第一版
  await createOrUpdateMemoryDocument({
    sageId,
    operation: "extract_from_sources",
    coreMemory: coreMemory,
    changeNotes: "Extract knowledge from sources",
  });
}
```

**Step 1: buildSageProfile**（生成专家档案）

- **模型**：`gemini-2.5-flash`（快速、成本低）
- **输出**：
  - `categories`（专长分类）：3-10 个核心主题
  - `bio`（专家简介）：2-3 句话的专业简介
  - `recommendedQuestions`：4 个推荐问题，供用户向专家提问
- **文件位置**：`src/app/(sage)/prompt/memory.ts:5-107`

**Step 2: buildSageCoreMemory**（构建核心记忆文档）

- **模型**：`claude-haiku-4-5`（更深度的理解和组织）
- **输出**：结构化的 Markdown 记忆文档
- **文件位置**：`src/app/(sage)/processing/memory.ts:176-259`

**设计原则**（memoryReorganize prompt）：
1. **人类可读**: 清晰的 Markdown 格式
2. **AI 友好**: 结构化组织，方便 AI 理解和使用
3. **完整性**: 包含所有重要知识
4. **连贯性**: 知识点之间有逻辑联系
5. **叙事性**: 不简单列举，有深度和细节
6. **边界清晰**: 明确专家知道什么、不知道什么

**示例**：
假设用户上传了关于"用户体验设计"的 3 本书和 5 篇文章，系统会：
- 提取所有文本内容
- 生成专家档案："用户体验设计专家，专长包括交互设计、可用性测试、设计系统..."
- 构建记忆文档：按主题组织（交互设计原则、用户研究方法、设计工具...），每个主题包含关键点、见解、经验

### Phase 2: 用户咨询专家（Sage Chat）

#### 2.1 加载记忆

```typescript
// src/app/(sage)/prompt/chat.ts:6-133
export const sageChatSystemPrompt = ({
  sage, coreMemory, workingMemory, locale
}) => {
  return `
# 核心记忆
${coreMemory}

# 工作记忆（最近补充的知识）
${workingMemory.length > 0 ? workingMemory.join("\n") : "暂无"}

---

你是 ${sage.name}，一位 ${sage.domain} 领域的专家。

# 对话指南

1. **基于记忆回答**
   - 从你的记忆文档中提取相关知识
   - 引用具体的经验和案例
   - 保持回答与你的专业背景一致

2. **保持专家身份**
   - 使用专业但易懂的语言
   - 展现你的专业深度和广度

3. **诚实面对边界**
   - 明确说明你的知识边界
   - 不要编造不在记忆中的信息
   - 当遇到不熟悉的话题时，诚实承认并考虑使用工具搜索最新信息

4. **提供价值**
   - 给出深入、有洞察的回答
   - 提供可操作的建议
   - 分享实践经验和具体案例

5. **善用工具**
   - 当需要最新信息时，使用 google_search
   - 当遇到复杂问题需要深度分析时，使用 reasoningThinking
  `;
};
```

**关键特性**：
- 综合运用 Core Memory 和 Working Memory
- 明确知识边界，不编造信息
- 可以使用工具（google_search, reasoningThinking）补充知识
- 保持专家的对话风格和特点

#### 2.2 对话示例

**用户**："在设计移动端表单时，有哪些最佳实践？"

**Sage 专家**（基于 Core Memory 回答）：
> 根据我对用户体验设计的理解，移动端表单设计有几个关键原则：
>
> 1. **最小化字段数量**：研究表明，每增加一个字段，表单完成率下降约 5-7%。只要求真正必需的信息。
>
> 2. **智能输入方式**：
>    - 使用正确的键盘类型（数字键盘用于电话号码，邮箱键盘用于邮箱等）
>    - 提供自动完成和建议（如地址、城市）
>
> 3. **即时验证**：在用户输入时提供即时反馈，而不是等到提交时才显示错误
>
> 我在之前的项目中发现，将一个 10 字段的表单拆分为 3 步骤式表单后，完成率从 32% 提升到 68%。这是因为...

**关键点**：
- 引用具体的知识点（字段数量与完成率的关系）
- 分享实践经验（项目案例）
- 提供可操作的建议

### Phase 3: 自动发现知识缺口（Discover Knowledge Gaps）

#### 3.1 触发机制

```typescript
// src/app/(sage)/processing/gaps.ts:28-208
export async function discoverKnowledgeGapsFromSageChats({
  sageId, limit = 20, locale, logger, statReport, abortSignal
}) {
  // 1. 获取最近 N 个未分析的对话
  const chatsWithoutGapAnalysis = await prisma.$queryRaw`
    SELECT id FROM "SageChat"
    WHERE "sageId" = ${sageId}
      AND ("extra"::jsonb -> 'gapDiscovered' IS NULL OR "extra"::jsonb -> 'gapDiscovered' != 'true')
    ORDER BY id DESC
    LIMIT 20
  `;

  // 2. 批量分析所有对话，发现知识缺口
  const result = await generateObject({
    model: llm("gpt-5-mini"),
    providerOptions: {
      openai: {
        reasoningSummary: "auto",
        reasoningEffort: "minimal",
      }
    },
    schema: knowledgeGapDiscoverySchema,
    system: discoverKnowledgeGapsFromSageChatsSystemPrompt({ sage, locale }),
    messages,
  });

  // 3. 创建 gap 记录
  await prisma.sageKnowledgeGap.createMany({
    data: discoveredGaps.map(gap => ({
      sageId,
      area: gap.area,
      description: gap.description,
      severity: gap.severity,
      impact: gap.impact,
      extra: { sourceChat: { id, token } },
    })),
  });
}
```

**触发时机**：用户在 Sage 详情页点击"发现知识缺口"

**分析范围**：最近 20 个未分析过的对话

#### 3.2 知识缺口检测标准

```typescript
// src/app/(sage)/prompt/gaps.ts:22-45
<Detection Criteria - 知识空白的标志>
1. **专家明确表示不知道或不确定** - 这是最明显的知识缺口
2. **回答模糊、空泛，缺乏具体信息** - 专家给出了答案但缺少实质内容
3. **回避问题，转移话题** - 专家没有直接回答用户的问题
4. **回答明显不专业或错误** - 答案质量不符合专业水平
5. **缺少实例、数据、经验支撑** - 理论正确但缺乏实践经验

<Severity Assessment - 严重程度评估>
- **critical（关键）**: 用户明确询问核心问题，但专家无法充分回答
- **important（重要）**: 对话中涉及的领域，专家回答不够深入或不够专业
- **nice-to-have（锦上添花）**: 相关但不紧急的知识补充

<Ignore - 不要识别为 Gap>
- 正常的合理边界（如"这不在我的专业范围"） - 这不是知识缺口
- 需要更多上下文的追问 - 这是正常对话流程
- 专家给出了合理、专业的回答 - 没有问题就不要创建 gap
```

**使用模型**：`gpt-5-mini`（带推理功能，reasoning effort: minimal）

#### 3.3 Knowledge Gap 数据结构

```typescript
// prisma/schema.prisma:724-740
model SageKnowledgeGap {
  id          Int       @id
  sageId      Int
  sage        Sage      @relation(...)
  area        String    @db.VarChar(255)        // 知识领域
  description String    @db.Text                // 详细描述
  severity    String    @db.VarChar(32)         // critical | important | nice-to-have
  impact      String    @db.Text                // 影响说明
  resolvedAt  DateTime? @db.Timestamptz(6)      // 解决时间（null = 未解决）
  // extra 包含:
  // - sourceChat: { id: number, token: string } - 来源对话（UserChat.id+token，用于 UI 跳转）
  // - resolvedChat: { id: number, token: string } - 解决访谈（SageInterview 的 userChatId+token）
  extra       Json      @default("{}")

  createdAt DateTime
  updatedAt DateTime
}
```

**示例 Gap**：
```json
{
  "area": "A/B测试统计方法",
  "description": "用户询问如何计算A/B测试的样本量和置信区间，专家回答模糊，缺少具体公式和计算步骤",
  "severity": "important",
  "impact": "统计方法是用户体验研究的核心技能，缺少这部分知识会降低专家的专业性",
  "userQuestion": "如何确定A/B测试需要多少样本量？"
}
```

### Phase 4: 补充访谈（Sage Interview）

#### 4.1 访谈系统

```typescript
// prisma/schema.prisma:712-722
model SageInterview {
  id         Int      @id
  sageId     Int
  sage       Sage     @relation(...)
  userChatId Int      @unique
  userChat   UserChat @relation(...)
  extra      Json     @default("{}")

  createdAt DateTime
  updatedAt DateTime
}
```

**触发方式**：
- 用户在 Sage 详情页点击"补充访谈"
- 系统自动拉取未解决的 Knowledge Gaps

#### 4.2 访谈流程

```typescript
// src/app/(sage)/prompt/chat.ts:135-150
export const sageInterviewConversationSystem = ({
  sage, locale
}) => `
你是专业的知识访谈官，正在对 ${sage.name}（${sage.domain} 领域专家）的创建者进行补充访谈，以完善专家知识。

<任务>
1. 根据知识缺口列表，针对性提问
2. 深入挖掘专家的经验和见解
3. 提取可操作的知识点
4. 确保回答具有实践价值
</任务>

<访谈风格>
- 专业但友好
- 针对性强，直击要点
- 追问细节和具体案例
- 确保知识的完整性和可用性
</访谈风格>
`;
```

**访谈示例**：

**AI 访谈官**："我注意到在之前的对话中，有用户询问 A/B 测试的样本量计算，但当时的回答比较模糊。能否详细说明一下：
1. 如何根据预期效果量计算所需样本量？
2. 有哪些常用的统计方法和公式？
3. 在实际项目中，你是如何确定样本量的？"

**用户（专家创建者）**："好的。样本量计算主要考虑三个因素：
1. 显著性水平（α）：通常设为 0.05
2. 统计功效（1-β）：通常设为 0.8
3. 最小可检测效应量（MDE）：取决于业务目标...

在我之前的项目中，我们使用了 Evan's Awesome A/B Tools，它可以根据基线转化率和目标提升自动计算样本量。例如..."

#### 4.3 提取新知识到 Working Memory

访谈完成后，系统自动：
1. 提取对话中的新知识
2. 添加到 Sage 的 Working Memory
3. 标记 Knowledge Gap 为 `resolved`

```typescript
// src/app/(sage)/lib.ts:66-100
export async function addWorkingMemory({
  sageId, workingItem
}: {
  sageId: number;
  workingItem: WorkingMemoryItem;
}) {
  const latestDoc = await prisma.sageMemoryDocument.findFirst({
    where: { sageId },
    orderBy: { version: "desc" },
  });

  const currentWorking = latestDoc.working as WorkingMemoryItem[];
  const updatedWorking = [...currentWorking, workingItem];

  await prisma.sageMemoryDocument.update({
    where: { id: latestDoc.id },
    data: {
      working: updatedWorking,
      changeNotes: `${latestDoc.changeNotes}\n\n[Update] Added working memory from interview ${workingItem.sourceChat.token}`,
    },
  });
}
```

**Working Memory Item 结构**：
```typescript
{
  knowledge: "A/B测试样本量计算方法：基于显著性水平α=0.05，统计功效1-β=0.8，使用公式 n = (Zα/2 + Zβ)² × 2p(1-p) / (p₂-p₁)²...",
  sourceChat: {
    id: 12345,
    token: "abc123xyz",
  },
  timestamp: "2026-01-15T10:30:00Z"
}
```

### Phase 5: 持续进化

- **用户继续咨询** → Sage 使用 Core Memory + Working Memory 回答
- **发现新的 Gaps** → 触发新一轮补充访谈
- **定期整合** → 将 Working Memory 整合到 Core Memory（未来功能）

---

## 技术实现细节

### 数据库 Schema

```typescript
// prisma/schema.prisma:662-683
model Sage {
  id        Int    @id @default(autoincrement())
  token     String @unique @db.VarChar(64)
  userId    Int
  user      User   @relation(...)
  name      String @db.VarChar(255)
  domain    String @db.VarChar(255)
  expertise Json   @default("[]")         // 专长分类（来自 buildSageProfile）
  avatar    Json   @default("{}")
  bio       String @db.Text               // 专家简介（来自 buildSageProfile）
  locale    String @db.VarChar(16)
  extra     Json   @default("{}")         // 包含 recommendedQuestions

  createdAt DateTime
  updatedAt DateTime

  chats           SageChat[]              // 用户咨询对话
  interviews      SageInterview[]         // 补充访谈
  sources         SageSource[]            // 知识源（文档、文件、URL）
  knowledgeGaps   SageKnowledgeGap[]      // 知识缺口
  memoryDocuments SageMemoryDocument[]    // 记忆文档版本
}
```

### 使用的 AI 模型

| 操作 | 模型 | 原因 |
|------|------|------|
| **buildSageProfile** | `gemini-2.5-flash` | 快速、成本低，任务简单（分类和提取） |
| **buildSageCoreMemory** | `claude-haiku-4-5` | 深度理解和组织知识，生成结构化文档 |
| **Sage Chat** | 用户可配置（默认 claude-sonnet-4-5） | 需要推理能力和对话质量 |
| **Discover Knowledge Gaps** | `gpt-5-mini` | 推理功能（reasoning effort: minimal），批量分析对话 |
| **Interview** | 用户可配置（默认 claude-sonnet-4-5） | 需要追问和深入挖掘 |

### 版本管理

```typescript
// src/app/(sage)/lib.ts:10-62
export async function createOrUpdateMemoryDocument({
  sageId, operation, coreMemory, changeNotes
}: {
  sageId: number;
  operation: "extract_from_sources" | "manual_edit_core";
  coreMemory: string;
  changeNotes: string;
}) {
  // 获取最新版本
  const latestDoc = await prisma.sageMemoryDocument.findFirst({
    where: { sageId },
    orderBy: { version: "desc" },
  });

  if (!latestDoc) {
    // 首次创建，version 1
    return await prisma.sageMemoryDocument.create({
      data: {
        sageId,
        version: 1,
        core: coreMemory,
        working: [],
        changeNotes,
      },
    });
  } else {
    // 创建新版本
    const newVersion = latestDoc.version + 1;
    return await prisma.sageMemoryDocument.create({
      data: {
        sageId,
        version: newVersion,
        core: coreMemory || latestDoc.core,
        working: latestDoc.working ?? [],  // 复制 working memory
        changeNotes,
      },
    });
  }
}
```

**版本更新触发**：
- 初次创建：从 Sources 提取知识 → Version 1
- 手动编辑 Core Memory → Version N+1
- 整合 Working Memory → Version N+1（未来功能）

---

## 实际案例：创建 UX 设计专家

### Step 1: 上传 Sources

**用户操作**：
- 上传 3 本书：《Don't Make Me Think》、《The Design of Everyday Things》、《Sprint》
- 上传 5 篇文章：关于移动端设计、表单设计、可用性测试
- 添加 2 个 URL：个人博客文章

**系统处理**：
- 提取所有文本内容（PDF OCR、网页抓取）
- 存储为 `SageSource` 记录
- 状态：等待知识提取

### Step 2: 自动提取知识

**系统执行**（需要 3-5 分钟）：

1. **生成专家档案**（buildSageProfile）：
   ```json
   {
     "categories": [
       "交互设计原则",
       "可用性测试",
       "移动端设计",
       "表单设计",
       "设计系统",
       "用户研究方法",
       "设计Sprint"
     ],
     "bio": "拥有10年用户体验设计经验，专注于移动端产品设计和可用性研究。曾参与多个大型互联网产品的设计优化，擅长将用户研究转化为可落地的设计方案。",
     "recommendedQuestions": [
       "如何进行有效的可用性测试？",
       "移动端表单设计有哪些最佳实践？",
       "如何说服团队采用设计系统？",
       "在资源有限的情况下如何快速验证设计想法？"
     ]
   }
   ```

2. **构建核心记忆文档**（buildSageCoreMemory）：
   ```markdown
   # Expert Profile
   - Name: UX设计专家
   - Domain: 用户体验设计
   - Expertise: 交互设计原则、可用性测试、移动端设计、表单设计、设计系统、用户研究方法、设计Sprint
   - Language: 中文

   # Core Knowledge

   ## Topic 1: 交互设计原则
   ### Key Points
   - **可见性（Visibility）**: 用户应该能看到系统状态和可用操作。Steve Krug 的"Don't Make Me Think"强调，最好的界面是用户不需要思考就能理解的界面。
   - **反馈（Feedback）**: 每个用户操作都应该有即时、清晰的反馈。Don Norman 在《The Design of Everyday Things》中指出，缺少反馈是用户体验问题的主要来源之一。
   - **一致性（Consistency）**: 相似的操作和元素应该有一致的表现。这降低了学习成本，提高了效率。

   ### Insights
   - 可见性不仅是视觉可见，更是功能可发现性（Affordance）。按钮应该"看起来就像"按钮。
   - 反馈的时机比反馈的形式更重要。延迟超过 100ms 的反馈会让用户感到卡顿。

   ### Experience
   - 在某电商 App 项目中，我们发现用户在提交订单后没有明确的成功反馈，导致 12% 的用户重复提交。添加了明确的成功页面和动画后，重复提交率下降到 1%。
   - 在设计系统推广中，我制作了一个"不一致性地图"，标出所有不一致的按钮样式，视觉冲击力强，成功说服了团队采用统一的设计系统。

   ## Topic 2: 可用性测试
   ### Key Points
   - **5个用户足够**: Jakob Nielsen 的研究表明，5 个用户的可用性测试能发现 85% 的问题。更多用户带来的边际收益递减。
   - **任务导向**: 设计具体的任务场景，观察用户的自然行为，而不是让用户"随便看看"。
   - **Think Aloud**: 让用户说出思考过程，这能暴露认知障碍和误解。

   ...（更多主题）

   # Conversation Style
   - Tone: 专业但友好，避免过于学术化的语言
   - Approach: 结合理论和实践，优先给出可操作的建议
   - Signature phrases: "在我之前的项目中..."、"我发现..."、"一个有效的方法是..."

   # Knowledge Boundaries
   - Current strengths: 移动端和Web端用户体验设计、可用性研究、设计Sprint、设计系统
   - Known limitations: VR/AR 设计经验有限，对最新的 AI 设计工具（如 Figma AI）了解不深
   - Learning areas: 无障碍设计（Accessibility）的高级技巧、设计度量和分析
   ```

3. **保存为 Version 1**：
   - `sageMemoryDocument.version = 1`
   - `changeNotes = "Extract knowledge from sources"`

### Step 3: 用户咨询

**用户提问**："我们的移动应用有个注册表单，完成率很低，只有 35%。应该如何优化？"

**Sage 专家回答**（基于 Core Memory）：
> 注册表单完成率 35% 确实偏低（行业平均在 50-60%）。基于我的经验，可以从以下几个方面优化：
>
> **1. 字段数量**
> - 检查是否所有字段都必需。研究表明，每增加一个字段，完成率下降 5-7%。
> - 区分"必需"和"可选"，考虑将非必需信息移到注册后的欢迎流程中收集。
>
> **2. 输入方式**
> - 使用正确的键盘类型（电话号码用数字键盘，邮箱用邮箱键盘）
> - 提供自动完成和建议（如城市选择）
> - 考虑社交登录（微信、手机号快速登录）
>
> **3. 即时验证**
> - 在用户输入时提供即时反馈，而不是等到提交时才显示错误
> - 密码强度指示器、邮箱格式检查等
>
> **4. 分步骤**
> - 如果字段超过 5 个，考虑拆分为多步骤表单
> - 在我之前的项目中，将一个 10 字段的表单拆分为 3 步后，完成率从 32% 提升到 68%
>
> **5. 减少焦虑**
> - 说明为什么需要某些信息（"我们需要手机号来保护账户安全"）
> - 明确隐私政策链接
>
> 我建议先做一次 5 人的可用性测试，观察用户在填写表单时遇到的具体障碍。这比猜测更高效。你们目前的表单有多少个字段？

**关键点**：
- 引用具体数据（字段数量与完成率的关系）
- 分享实践经验（项目案例：32% → 68%）
- 提供可操作的建议（5 个具体方向）
- 主动追问，收集更多上下文

### Step 4: 发现知识缺口

**3 周后，用户点击"发现知识缺口"**

**系统分析**：最近 20 个对话，发现 3 个 Gaps：

**Gap 1（Critical）**:
```json
{
  "area": "无障碍设计（Accessibility）",
  "description": "用户询问如何让表单支持屏幕阅读器，专家回答非常模糊，只提到'使用语义化HTML'和'添加ARIA标签'，但缺少具体的实现步骤和测试方法",
  "severity": "critical",
  "impact": "无障碍设计是UX设计的重要组成部分，缺少这方面的专业知识会降低专家的全面性",
  "userQuestion": "如何确保表单对视障用户友好？需要做哪些具体的无障碍优化？",
  "sourceChat": { "id": 12345, "token": "abc123" }
}
```

**Gap 2（Important）**:
```json
{
  "area": "设计度量和分析",
  "description": "用户询问如何量化设计改进的效果，专家提到了A/B测试，但对统计方法、样本量计算、置信区间等细节不够清楚",
  "severity": "important",
  "impact": "数据驱动的设计决策需要量化能力，缺少这方面知识会降低专家的说服力",
  "userQuestion": "如何设计A/B测试来验证表单优化的效果？需要多少样本量？",
  "sourceChat": { "id": 12350, "token": "xyz789" }
}
```

**Gap 3（Nice-to-have）**:
```json
{
  "area": "Figma AI 插件和自动化工具",
  "description": "用户询问是否可以用AI工具自动生成表单布局，专家表示不了解最新的AI设计工具",
  "severity": "nice-to-have",
  "impact": "了解最新工具能提升工作效率，但不是核心专业能力",
  "userQuestion": "有没有AI工具可以自动生成表单设计？",
  "sourceChat": { "id": 12360, "token": "def456" }
}
```

### Step 5: 补充访谈

**用户点击"针对 Gap 1 进行补充访谈"**

**AI 访谈官**："我注意到在之前的对话中，有用户询问无障碍设计的具体实现，但回答比较模糊。能否详细说明：
1. 表单的无障碍设计有哪些具体的技术要求？
2. 如何测试表单的无障碍性？
3. 有哪些常见的无障碍设计问题和解决方案？"

**用户（专家创建者）**："好的。表单的无障碍设计主要涉及以下几个方面：

**技术要求**：
1. **Label 和 Input 关联**：每个输入框都必须有 `<label>` 标签，并通过 `for` 属性关联到对应的 `<input>` 元素。这样屏幕阅读器才能正确宣读。
2. **ARIA 属性**：
   - `aria-required="true"` 标记必填字段
   - `aria-invalid="true"` 标记验证失败的字段
   - `aria-describedby` 关联错误提示和帮助文本
3. **键盘导航**：确保所有表单元素都可以通过 Tab 键访问，Tab 顺序符合逻辑
4. **错误提示**：错误提示要明确具体，不要只依赖颜色（色盲用户看不到）

**测试方法**：
1. 使用屏幕阅读器测试（macOS 的 VoiceOver、Windows 的 NVDA）
2. 仅用键盘操作表单（不使用鼠标）
3. 使用自动化工具如 axe DevTools 检测基础问题
4. WCAG 2.1 Level AA 是行业标准

**常见问题**：
1. Label 缺失或未关联：这是最常见的问题
2. 错误提示只用颜色标记：红色边框对色盲用户无效
3. 自定义控件（如日期选择器）没有正确的 ARIA 属性
4. 焦点样式被禁用（`:focus { outline: none; }` 是大忌）

在我之前的项目中..."

**系统处理**：
- 提取新知识 → 添加到 Working Memory
- 标记 Gap 1 为 `resolved`，`resolvedAt = 2026-01-18`，`extra.resolvedChat = { id: 99999, token: "interview123" }`

### Step 6: 持续进化

**2 周后，用户再次咨询**：

**用户**："我们要对表单进行无障碍改造，有什么建议吗？"

**Sage 专家回答**（结合 Core Memory + Working Memory）：
> 表单的无障碍改造是个很重要的工作。根据 WCAG 2.1 Level AA 标准，我建议从以下几个方面着手：
>
> **1. Label 和 Input 关联**（最重要）
> - 每个输入框都必须有 `<label>` 标签：
> ```html
> <label for="username">用户名</label>
> <input type="text" id="username" name="username" />
> ```
> - 不要使用 placeholder 代替 label（常见错误）
>
> **2. ARIA 属性**
> - 必填字段：`<input aria-required="true" />`
> - 验证错误：`<input aria-invalid="true" aria-describedby="username-error" />`
> - 错误提示：`<span id="username-error">用户名必须至少6个字符</span>`
>
> **3. 键盘导航**
> - 确保所有元素可以通过 Tab 键访问
> - 不要禁用焦点样式（`:focus { outline: none; }` 是大忌）
>
> **4. 错误提示**
> - 不要只用颜色（红色边框对色盲用户无效）
> - 提供具体的错误说明，不要只说"格式错误"
>
> **测试方法**：
> 1. 使用屏幕阅读器（macOS 的 VoiceOver、Windows 的 NVDA）
> 2. 仅用键盘操作（Tab、Enter、Space）
> 3. 使用 axe DevTools 自动检测
>
> 在我之前的项目中，我们通过这些改造将表单的无障碍合规率从 40% 提升到 95%。建议先用 axe DevTools 扫描一遍，快速定位明显问题。
>
> 你们的表单目前有用到自定义控件（如日期选择器）吗？这些通常是无障碍问题的重灾区。

**关键点**：
- **Working Memory 的知识已被整合**：专家现在能详细回答无障碍设计问题
- **保持一致性**：回答风格和深度与之前一致
- **持续提供价值**：不仅回答问题，还主动追问上下文

---

## 10 个常见问题

### 1. Sage 和 AI Persona 有什么区别？

| 维度 | Sage 可进化专家 | AI Persona (Tier2/3) |
|------|--------------|---------------------|
| **核心定位** | 领域专家（深度） | 真人消费者（广度） |
| **知识来源** | 文档、文件、访谈 | Scout 观察、深度访谈 |
| **使用场景** | 专业咨询、知识管理 | 市场研究、用户访谈 |
| **可进化性** | ✅ 自动发现缺口+补充 | ❌ 静态画像 |
| **记忆类型** | 结构化知识文档 | 7 维度画像评分 |
| **对话方式** | 专家咨询（深度） | 消费者访谈（真实性） |

**类比**：
- **Sage**：你公司的资深专家顾问（如首席架构师、设计总监）
- **AI Persona**：你的目标客户群体（如 Z 世代大学生、中产妈妈）

**使用建议**：
- 需要专业建议 → 咨询 Sage
- 需要了解用户想法 → 访谈 AI Persona

### 2. 创建一个 Sage 需要多长时间？

**时间分解**：

| 步骤 | 时间 | 说明 |
|------|------|------|
| **上传 Sources** | 5-10 分钟 | 取决于文档数量 |
| **系统提取知识** | 3-5 分钟 | 自动执行 |
| **总计** | **8-15 分钟** | 即可创建可用的专家 |

**后续进化**：
- 用户咨询 → 实时
- 发现 Knowledge Gaps → 2-3 分钟（批量分析 20 个对话）
- 补充访谈 → 10-20 分钟（取决于 Gap 复杂度）

**对比**：
- 训练一个定制化 LLM：数周到数月
- 构建传统知识库：数天到数周
- 创建 Sage：**10 分钟**

### 3. Sage 能处理多少知识？

**Sources 数量**：无硬性限制，但推荐：
- 文档数量：5-20 份
- 总文本量：50K - 500K tokens
- 单个文档：不超过 100 页（PDF）

**Core Memory 大小**：
- 典型大小：10K - 50K tokens
- 推荐大小：20K - 30K tokens（约 15-25 页 Markdown）
- 过大的 Memory 会影响对话质量（LLM context window 限制）

**Working Memory**：
- 无限制，但建议定期整合到 Core Memory
- 每个 item 约 500-2000 tokens

**扩展策略**：
- 如果知识量巨大（> 500K tokens），考虑创建多个专家（按子领域划分）
- 使用 RAG（Retrieval-Augmented Generation）检索相关知识片段（未来功能）

### 4. Core Memory 和 Working Memory 如何协同？

**类比：人类大脑**

- **Core Memory** = 长期记忆（Long-term Memory）
  - 存储：稳定、结构化、经过组织
  - 访问：需要检索，但可靠
  - 更新：较慢，需要整合过程

- **Working Memory** = 短期记忆（Short-term Memory）
  - 存储：临时、未结构化、待整合
  - 访问：快速直接
  - 更新：实时添加

**协同机制**：

1. **对话时**：
   - Sage 同时访问 Core + Working
   - Working 中的新知识优先级更高（最近学到的）

2. **访谈后**：
   - 新知识添加到 Working Memory
   - 不立即修改 Core Memory（避免频繁重组）

3. **定期整合**（未来功能）：
   - 当 Working Memory 积累到一定量（如 10 个 items）
   - 触发整合：将 Working Memory 融入 Core Memory
   - 创建新版本，清空 Working Memory

### 5. 如何确保 Sage 不会"编造"知识？

**多层防护**：

1. **明确知识边界**（在 Core Memory 中）：
   ```markdown
   # Knowledge Boundaries
   - Current strengths: [擅长的领域]
   - Known limitations: [专家不知道的内容]
   - Learning areas: [需要扩展的主题]
   ```

2. **System Prompt 强调诚实**：
   ```
   3. **诚实面对边界**
      - 明确说明你的知识边界
      - 不要编造不在记忆中的信息
      - 当遇到不熟悉的话题时，诚实承认
   ```

3. **使用工具补充**：
   - 当 Sage 不确定时，可以使用 `google_search` 搜索最新信息
   - 使用 `reasoningThinking` 进行深度分析

4. **Knowledge Gap 发现**：
   - 自动检测专家回答质量
   - 标记"模糊、空泛"的回答
   - 触发补充访谈

**示例**：

**用户**："最新的 Figma AI 插件有哪些？"

**Sage 专家**（诚实回答）：
> 抱歉，我对最新的 Figma AI 插件了解不多，因为我的知识主要来源于经典设计书籍和我的项目经验。让我用 google_search 帮你查找最新信息...
>
> （使用工具搜索）
>
> 根据搜索结果，目前比较热门的 Figma AI 插件有：...

### 6. Sage 可以用于哪些场景？

**企业场景**：

1. **内部专家库**
   - 保存资深员工的专业知识（离职后知识不流失）
   - 新员工快速获取专家指导
   - 示例：首席架构师的技术决策知识库

2. **客户支持**
   - 创建产品专家，回答客户常见问题
   - 比 FAQ 更灵活，比真人支持更高效
   - 示例：SaaS 产品的技术支持专家

3. **培训和教育**
   - 创建课程专家，辅导学员学习
   - 24/7 可用，个性化答疑
   - 示例：编程培训的助教专家

4. **咨询和决策支持**
   - 创建领域顾问，辅助决策
   - 整合行业报告、最佳实践
   - 示例：市场营销策略顾问

**个人场景**：

1. **个人知识管家**
   - 整合个人笔记、阅读材料
   - 随时查询和回顾知识
   - 示例：读书笔记专家

2. **学习助手**
   - 上传教材、课件，创建学习专家
   - 辅助复习和答疑
   - 示例：考研专业课助手

3. **专业成长**
   - 记录职业经验和项目教训
   - 反思和总结
   - 示例：项目管理经验库

### 7. Sage 的成本如何？

**创建成本**（一次性）：

| 操作 | 模型 | Token 消耗（估算） | 成本（估算） |
|------|------|------------------|------------|
| **buildSageProfile** | gemini-2.5-flash | 10K - 30K tokens | $0.01 - 0.03 |
| **buildSageCoreMemory** | claude-haiku-4-5 | 20K - 80K tokens | $0.02 - 0.08 |
| **总计** | - | **30K - 110K tokens** | **$0.03 - 0.11** |

**使用成本**（每次对话）：

| 操作 | 模型 | Token 消耗 | 成本 |
|------|------|----------|------|
| **Sage Chat** | claude-sonnet-4-5 | Core Memory (20K) + 对话 (5K) = 25K | $0.025 |
| **Knowledge Gap Discovery** | gpt-5-mini | 20 个对话 (100K) = 100K | $0.10 |
| **Interview** | claude-sonnet-4-5 | Core Memory (20K) + 对话 (10K) = 30K | $0.03 |

**典型用户（1个月）**：
- 创建 3 个 Sage：$0.10 - 0.30
- 100 次对话：$2.50
- 3 次 Gap Discovery：$0.30
- 10 次补充访谈：$0.30
- **总计**：约 **$3.20 - 3.40/月**

**对比**：
- 定制化 LLM 训练：$10,000 - $100,000+
- 传统知识管理系统：$50 - $500/月/用户
- Sage：**$3 - 5/月**（包含多个专家）

### 8. Sage 和 RAG（检索增强生成）有什么区别？

| 维度 | Sage (Memory Document) | RAG (Retrieval-Augmented Generation) |
|------|----------------------|-------------------------------------|
| **知识组织** | 结构化记忆文档（Markdown） | 向量数据库（Embeddings） |
| **知识形式** | 叙事性、有上下文 | 碎片化、独立段落 |
| **检索方式** | 全文加载到 context | 语义搜索，检索 Top-K 片段 |
| **可读性** | ✅ 人类可读和编辑 | ❌ 向量不可读 |
| **AI 友好** | ✅ LLM 理解上下文 | ⚠️ 片段可能缺少上下文 |
| **可进化性** | ✅ 通过访谈补充 | ⚠️ 需要重新 embed |
| **适用规模** | 小到中（< 50K tokens） | 中到大（> 100K tokens） |

**什么时候用 Sage**：
- 知识量适中（< 50K tokens）
- 需要人类可读和编辑
- 需要上下文和叙事性
- 需要自动发现知识缺口

**什么时候用 RAG**：
- 知识量巨大（> 100K tokens）
- 文档数量众多（> 100 份）
- 需要快速检索
- 知识更新频繁

**未来计划**：
- Sage 未来可能支持 RAG 作为可选功能
- 用户可以选择"Memory Document"或"RAG"模式

### 9. 如何评估 Sage 的质量？

**定量指标**：

1. **对话满意度**
   - 用户对每次回答的评分（1-5 星）
   - 目标：平均 4+ 星

2. **Knowledge Gap 数量**
   - Critical Gaps：应该趋近于 0
   - Important Gaps：定期减少
   - 目标：每月减少 50%

3. **回答完整性**
   - 回答是否包含具体案例、数据支撑
   - 目标：80%+ 的回答包含实践经验

4. **边界清晰度**
   - 专家承认"不知道"的比例
   - 目标：5-10%（太低 = 可能编造，太高 = 知识不足）

**定性评估**：

1. **Core Memory 质量**
   - 结构是否清晰
   - 知识点是否有深度和细节
   - 是否包含实践经验和案例

2. **对话质量**
   - 专业性：是否展现专业深度
   - 实用性：是否提供可操作建议
   - 个性化：是否符合专家身份

3. **进化效果**
   - Working Memory 是否持续增长
   - Knowledge Gaps 是否被有效解决
   - 对话质量是否随时间提升

### 10. 未来会有哪些增强功能？

**短期（3-6 个月）**：

1. **自动整合 Working Memory 到 Core Memory**
   - 当 Working Memory 积累到 10+ items
   - 自动触发整合，重组 Core Memory
   - 创建新版本

2. **Sage 协作**
   - 多个 Sage 协同回答复杂问题
   - 例如：UX 设计专家 + 前端开发专家 → 完整的设计实现方案

3. **知识图谱可视化**
   - 可视化 Sage 的知识体系
   - 识别知识盲区

4. **主动学习**
   - Sage 主动提出需要补充的知识领域
   - 推荐相关 Sources 或访谈主题

**中期（6-12 个月）**：

1. **RAG 支持**
   - 大规模知识库（> 50K tokens）支持 RAG 模式
   - 用户可选择 Memory Document 或 RAG

2. **多模态 Sources**
   - 支持视频、音频作为知识源
   - 自动转录和提取知识

3. **Sage 市场**
   - 用户可以分享和交易 Sage（保护隐私）
   - 预置专家库（行业专家、领域顾问）

4. **Sage 团队协作**
   - 团队共享 Sage
   - 多人协作补充访谈

**长期（12+ 个月）**：

1. **Sage 自主进化**
   - Sage 自主阅读文档、文章，更新知识
   - 自主进行网络搜索，填补 Gaps

2. **Sage 跨平台集成**
   - 集成到 Slack、Teams、企业知识库
   - API 接口供第三方应用使用

3. **Sage 集群**
   - 一个组织内的所有 Sage 形成知识网络
   - 跨专家协作和知识共享

---

## 总结：Sage 的价值

### 核心优势

1. **快速创建**：10 分钟从文档创建可用专家
2. **可进化**：自动发现知识缺口，持续成长
3. **结构化**：Memory Document 人类可读，AI 友好
4. **版本管理**：支持历史追溯和回滚
5. **边界清晰**：诚实面对不知道的领域
6. **成本低**：创建 $0.10，使用 $0.025/次对话

### 适用场景

- **企业**：内部专家库、客户支持、培训教育、咨询决策
- **个人**：个人知识管家、学习助手、专业成长

### 与其他系统的区别

- vs **AI Persona**：Sage = 专家（深度），Persona = 消费者（广度）
- vs **普通 AI**：Sage 有领域知识，普通 AI 是通用模型
- vs **RAG**：Sage 适合中小规模知识（< 50K tokens），RAG 适合大规模（> 100K tokens）

### 技术亮点

- **双层记忆架构**：Core (稳定) + Working (临时)
- **自动知识缺口发现**：使用 gpt-5-mini 推理功能
- **访谈补充机制**：针对性填补缺口
- **版本管理**：每次更新创建新版本
- **模型优化**：Profile 用 gemini-flash（快），Memory 用 claude-haiku（深）

### 代码位置总结

| 功能 | 文件路径 |
|------|---------|
| **Memory 处理** | `src/app/(sage)/processing/memory.ts` |
| **Gap 发现** | `src/app/(sage)/processing/gaps.ts` |
| **Sources 处理** | `src/app/(sage)/processing/sources.ts` |
| **Chat Prompt** | `src/app/(sage)/prompt/chat.ts` |
| **Memory Prompt** | `src/app/(sage)/prompt/memory.ts` |
| **Gap Prompt** | `src/app/(sage)/prompt/gaps.ts` |
| **Sage Lib** | `src/app/(sage)/lib.ts` |
| **Database Schema** | `prisma/schema.prisma:662-759` |

---

**Sage 让专业知识成为可以持续进化的智能体，而不是散落的文档。**
