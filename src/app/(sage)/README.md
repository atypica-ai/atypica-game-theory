# Sage (专家智能体) 系统文档

## 系统概述

Sage 是基于二层记忆管理的 AI 专家系统,通过知识源构建、知识空白识别、补充访谈等方式持续完善专家知识体系。

**核心特性**:

- 二层记忆架构 (Core / Working)
- 知识空白驱动的主动学习
- 多源知识整合
- 版本控制的记忆管理

**设计理念**:

```
Sources → Core Memory → User Chat → Gaps → Interview → Working Memory → Integrate → Core Memory
```

1. **知识源 → 核心记忆**: 用户上传文档/文本/URL，AI 提取并构建 Core Memory
2. **用户对话 → 发现空白**: 用户与 Sage 对话，定期批量分析发现 Knowledge Gaps
3. **系统访谈 → 补充知识**: 基于 Gaps 设计访谈计划，系统访谈 Sage 创建者，解决 Gaps 并记录 Working Memory
4. **定期整合 → 更新核心**: 将 Working Memory 整合到 Core Memory，完善知识体系

---

## 作为 Sage 创建者的完整使用流程

### Step 1: 创建 Sage 并构建初始知识
1. 进入 Sage 创建页面，输入名称和领域
2. 上传知识源（文档/文本/URL）
3. 系统提取知识并生成 Core Memory
4. Sage 可以开始对外提供咨询服务

### Step 2: 用户与 Sage 对话
- 用户在公开页面与 Sage 进行对话
- **对话过程中什么都不会发生**，只是纯粹的聊天
- 系统不会实时分析，不会产生任何 gaps

### Step 3: 主动分析对话发现 Gaps
1. 你进入 Sage 详情页的 **Chats Tab**
2. 查看所有用户与 Sage 的对话列表
3. 点击「**分析最近对话**」按钮
4. 系统批量分析最近 20 个对话
5. AI 识别 Sage 回答不充分的地方，创建 Knowledge Gaps

### Step 4: 查看和管理 Gaps
1. 切换到 **Gaps Tab**
2. 查看 **Pending Gaps**（待处理）和 **Resolved Gaps**（已解决）
3. 每个 Gap 显示：
   - 知识领域、描述、严重程度、影响
   - 来源对话链接（点击可跳转查看上下文）

### Step 5: 通过访谈解决 Gaps
1. 在 Gaps Tab 点击「**创建补充访谈**」
2. 系统基于所有 pending gaps 生成访谈计划
3. 进入访谈对话，AI 向你提问，你回答
4. 点击「**结束访谈**」按钮
5. 系统自动：
   - 提取访谈中的新知识 → 创建 **Working Memory**
   - 判断哪些 Gaps 已解决 → 标记为 resolved
   - 已解决的 Gaps 移到 Resolved 列表

### Step 6: 整合 Working Memory
1. 切换到 **Memory Tab**
2. 查看 Working Memory 列表（访谈补充的知识）
3. 点击「**整合到核心记忆**」按钮
4. AI 将 Working Memory 整合到 Core Memory
5. 创建新版本，Working Memory 清空

### Step 7: 持续改进
- 重复 Step 2-6，不断完善 Sage 的知识体系
- 每次对话都让 Sage 变得更专业

**关键设计理念**:
- ✅ **你完全控制**: 何时分析对话、何时创建访谈、何时整合知识
- ✅ **可追溯**: 每个 Gap 可追溯到来源对话，每个解决方案可追溯到访谈
- ✅ **对话时专注聊天**: 用户对话时不做任何后台分析，避免干扰

---

## 数据模型

### Sage (专家)

```typescript
{
  name: string
  domain: string
  expertise: string[]        // 专长领域
  locale: "zh-CN" | "en-US"
  avatar: { type, url }      // 头像
  bio: string                // 简介
  embedding: number[]        // 向量嵌入
  extra: {
    error: string | null;    // 处理错误信息
    recommendedQuestions: string[];  // 推荐问题
    processing: {            // 知识提取处理状态 (防止并发处理)
      startsAt: number;      // 开始时间戳
    } | false;
  }
}
```

### SageMemoryDocument (二层记忆文档)

```prisma
model SageMemoryDocument {
  sageId      Int
  version     Int              // 版本号,仅在整合 working 到 core 时递增

  // 二层记忆
  content     String @db.Text  // DEPRECATED: 已废弃,新版本固定为空字符串
  core        String @db.Text  // 核心记忆 (Markdown)
  working     Json   @default("[]")  // 工作记忆 (来自访谈的待整合知识)

  changeNotes String
  extra       Json   @default("{}")

  @@unique([sageId, version])
}
```

#### 二层记忆结构

**Core Memory (核心记忆)**:

- 稳定的、经过验证的核心知识
- Markdown 格式,结构化文档
- 来源于知识源的初始提取 + Working Memory 的定期整合
- 很少更新,除非整合 Working Memory

**Working Memory (工作记忆)**:

- **唯一来源**: Sage Interview (系统访谈)
- **作用**: 临时存储访谈中补充的新知识,等待整合到 Core Memory

```typescript
type WorkingMemoryItem = {
  id: string;
  content: string;          // 知识内容 (Markdown)
  sourceChat: {             // 来源访谈信息
    id: number;             // UserChat.id (对应 SageInterview 的 UserChat)
    token: string;          // UserChat.token
  };
  relatedGapIds: number[];  // 本次访谈解决的 Gap IDs
  status: "pending" | "integrated" | "discarded";
};
```

#### 版本控制策略

**版本递增时机**:

- ✅ 从知识源提取知识 (extract_from_sources)
- ✅ 整合 Working Memory 到 Core Memory (integrate_working)
- ✅ 手动编辑 Core Memory (manual_edit_core)
- ❌ 添加 Working Memory (不递增版本)

### SageKnowledgeGap (知识空白)

**定义**: Gap 是用户与专家对话中，专家无法充分回答的知识缺失。

**来源**: 只能来自 Sage Chat（用户与专家的对话），通过定期批量分析发现

```typescript
{
  sageId: number
  area: string                 // 知识领域
  description: string
  severity: "critical" | "important" | "nice-to-have"
  impact: string
  resolvedAt: Date | null     // 解决时间

  // 扩展信息（用于 UI 展示和追溯）
  extra: {
    // 来源信息（只用于 UI 展示，方便跳转）
    sourceChat?: {
      id: number              // UserChat.id (对应 SageChat 的 UserChat)
      token: string           // UserChat.token
    }

    // 解决信息（只用于 UI 展示，方便跳转）
    resolvedChat?: {
      id: number              // UserChat.id (对应 SageInterview 的 UserChat)
      token: string           // UserChat.token
    }
  }
}
```

**简化说明**:
- ❌ 移除顶层 `source` 和 `resolvedBy` 字段
- ✅ 所有追溯信息放在 `extra` 中，只用于 UI 展示和查看
- ✅ `sourceChat` 记录来源对话（方便点击跳转）
- ✅ `resolvedChat` 记录解决访谈（方便点击跳转）

### SageSource (知识源)

```typescript
{
  sageId: number;
  type: "text" | "file" | "url";
  content: {
    /* type-specific content */
  }
  extractedText: string; // 提取并压缩后的文本 (使用与 AI Study 相同的压缩算法)
  title: string; // 自动生成的标题
  extra: {
    error: string | null;
    processing: boolean;
  }
}
```

### SageInterview (补充访谈)

```typescript
{
  sageId: number
  userChatToken: string        // 关联 UserChat
  purpose: string
  focusAreas: string[]         // 基于 pending gaps 生成
  extra: {
    interviewPlan: {           // AI 生成的访谈计划
      purpose: string
      questions: Array<{
        question: string
        purpose: string
        followUps: string[]
      }>
    }
  }
}
```

---

## 核心流程

### 1. 创建专家 & 构建记忆

```
用户创建 Sage + 上传知识源
  ↓
手动触发: 重新提取知识 (reProcessSageSourcesAndExtractKnowledge)
  ↓
  Step 1: 处理所有知识源 (processSageSources)
    - 提取文本 (PDF: parsePDFToText, URL: parseURLToText)
    - 压缩文本 (compressText - 与 AI Study 相同算法)
    - 更新 SageSource.extractedText
  ↓
  Step 2: 并行生成专家档案和核心记忆
    - extractKnowledge_1_buildSageProfile (Gemini Flash)
      → 更新 Sage.expertise, bio, recommendedQuestions
    - extractKnowledge_2_buildSageCoreMemory (Claude Haiku)
      → 生成 Core Memory
  ↓
  Step 3: 创建 SageMemoryDocument (version: 1)
    - content: "" (DEPRECATED)
    - core: 从压缩后的知识源构建的核心记忆
    - working: []
    - changeNotes: "Extract knowledge from sources"
```

### 2. 批量分析对话发现知识空白

```
专家在 Sage Chats 页面点击「分析最近对话」按钮
  ↓
后台获取最近 N 个对话 (默认 20 个)
  ↓
AI 批量分析所有对话,检测专家回答的知识薄弱点
  ↓
创建多个 SageKnowledgeGap
  - 每个 gap 记录来源对话信息到 extra.sourceChat
  ↓
UI 展示:
  - Gap 卡片显示来源对话
  - 点击可跳转到原对话
  - 显示分析的对话数量和发现的 gap 数量
```

### 3. 补充访谈流程

```
用户点击 "创建补充访谈"
  ↓
查询所有 pending gaps → AI 生成访谈计划
  ↓
创建 SageInterview + UserChat
  ↓
进行访谈对话 (AI 按计划提问)
  ↓
用户手动点击 "结束访谈" 按钮
  ↓
后台异步处理:
  1. 提取访谈新知识 → 创建 WorkingMemoryItem
  2. AI 分析 gap 解决情况 → 更新 gap 状态
  3. 不递增版本号 (只是添加 working memory)
  ↓
更新 SageMemoryDocument:
  - core: 不变
  - working: [..., newWorkingMemoryItem]
  ↓
更新 SageKnowledgeGap:
  - resolvedAt: now()
  - extra.resolvedChat: { id, token }
```

### 4. 整合 Working Memory 到 Core

```
专家在 Memory Tab 查看 working memory 列表
  ↓
点击 "整合到核心记忆" 按钮
  ↓
AI 分析 working items → 更新 core memory 相关章节
  ↓
创建新版本:
  - version: version + 1
  - core: 更新后的内容
  - working: []  (清空)
  - changeNotes: "整合了 3 条工作记忆"
```

### 5. 对话时的记忆使用

```
用户提问
  ↓
构建系统提示词:
  - Core Memory (稳定知识)
  - Working Memory (访谈中补充的知识)
  ↓
AI 生成回答
```

---

## 知识空白来源

### 唯一来源: 对话批量分析

- **定义**: Gap 是用户与专家对话中，专家无法充分回答的知识缺失
- **触发方式**: 专家在 Sage Chats 页面手动触发「分析最近对话」
- **分析范围**: 批量分析最近 N 个对话（默认 20 个）
- **分析时机**: 专家主动触发，不在对话过程中自动分析
- **来源追溯**: 记录到 `extra.sourceChat: { id, token }` 用于 UI 跳转

**设计理念**:
- ✅ **对话时专注聊天**: 用户与 Sage 对话时，只管聊天，不做任何后台分析
- ✅ **专家主动控制**: 专家决定何时分析，清晰可控
- ✅ **批量高效**: 一次性分析多个对话，效率更高，成本可控
- ✅ **避免噪音**: 减少单次对话分析可能带来的误判
- ✅ **简化追溯**: Gap 只来自 Sage Chat，无需 source 字段

---

## 关键技术实现

### 1. 统一的文本压缩策略 ⭐

**核心改进**: Sage 知识源处理现在使用与 AI Study 附件处理相同的文本压缩算法

```typescript
// src/lib/attachments/processing.ts
export async function compressText({
  fullText,
  logger,
  abortSignal,
}): Promise<string>

// 在两个场景中复用:
// 1. AI Study 附件处理
// 2. Sage 知识源处理
```

**优势**:
- ✅ **成本优化**: 大幅减少存储和 AI 处理的 token 消耗
- ✅ **一致性**: 两个系统使用相同的压缩质量和策略
- ✅ **可维护性**: 压缩算法优化会同时惠及两个系统
- ✅ **质量保证**: 压缩算法经过 AI Study 验证,保留关键信息

**流程**:
```
Source (PDF/URL/Text) → Extract Full Text → Compress → Store
                                              ↑
                                    使用统一压缩算法
```

### 2. AI 智能 Gap 解决判断

使用 AI 分析访谈内容,判断哪些 Gap 已解决:

```typescript
await analyzeGapResolution({
  gaps,                      // pending gaps
  interviewTranscript,       // 访谈内容
  originalMemory,           // 访谈前的 core memory
  updatedMemory,            // 更新后的 core memory
})

// 返回已解决的 gapId 列表
// 简化设计: 不返回 confidence/evidence 等细节
```

### 3. 二层记忆架构

**设计原则**:

- Core Memory: 稳定知识,很少更新
- Working Memory: 访谈补充的临时知识,等待整合

**更新策略**:

- 新知识先进入 Working Memory (不递增版本)
- 定期或手动整合到 Core Memory (递增版本)

### 4. 访谈自动处理流程

```typescript
// 访谈结束后 (waitUntil 异步处理)
await updateMemoryDocumentFromInterview({
  sageId,
  interviewId,
  locale
})

步骤:
1. 提取访谈知识 → extractWorkingMemoryFromInterview()
2. 分析 gap 解决 → analyzeGapResolution()
3. 更新 working memory (不递增版本)
4. 更新 gap 状态 (resolvedAt, extra.resolvedChat)
```

### 5. 批量分析对话发现 Gaps

```typescript
// src/app/(sage)/processing/gaps.ts
export async function analyzeSageChatsForGaps({
  sageId,
  limit = 20,
  locale
}: {
  sageId: number;
  limit?: number;
  locale: Locale;
}): Promise<{
  analyzedChatsCount: number;
  newGapsCount: number;
}> {
  // 1. 获取最近 N 个未分析的对话
  const recentChats = await prisma.sageChat.findMany({
    where: { sageId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { userChat: { include: { messages: true } } }
  });

  // 2. 批量分析所有对话
  const allNewGaps = await discoverNewGapsFromChats({
    chats: recentChats,
    sageDomain: sage.domain,
    locale
  });

  // 3. 创建 gaps
  if (allNewGaps.length > 0) {
    await prisma.sageKnowledgeGap.createMany({
      data: allNewGaps
    });
  }

  return {
    analyzedChatsCount: recentChats.length,
    newGapsCount: allNewGaps.length
  };
}
```

---

## AI 模型使用策略

### 核心处理

- **生成专家档案** (buildSageProfile): `gemini-2.5-flash`
- **构建核心记忆** (buildSageCoreMemory): `claude-haiku-4-5` (优化成本)
- **生成访谈计划**: `claude-sonnet-4`

### 对话系统

- **专家对话**: `claude-sonnet-4-5`
- **补充访谈**: `claude-sonnet-4-5`

### 辅助分析

- **批量对话 Gap 分析**: `gpt-4o` (批量分析，准确性优先)
- **Gap 解决判断**: `claude-sonnet-4-5`
- **访谈知识提取**: `claude-sonnet-4-5`

---

## 文件结构

```
src/app/(sage)/
├── types.ts              # 类型定义
├── lib.ts                # CRUD 操作
├── actions.ts            # Server Actions
├── tools/                # AI Tools
│   └── index.ts
├── processing/           # 处理逻辑
│   ├── sources.ts       # 知识源解析
│   ├── memory.ts        # 记忆文档构建和更新
│   ├── gaps.ts          # Gap 分析
│   └── followup.ts      # 访谈计划生成
├── prompt/               # AI 提示词
├── messages/             # 国际化
├── (chat)/              # 对话相关路由
│   ├── api/chat/
│   │   ├── sage/        # 专家对话 API
│   │   └── sage-interview/  # 访谈 API
│   └── sage/
│       ├── chat/        # 对话界面
│       └── interview/   # 访谈界面
├── (public)/            # 公开页面
│   └── sage/
│       ├── create/      # 创建专家
│       └── profile/     # 公开主页
└── (detail)/            # 管理界面
    └── sage/[sageToken]/
        ├── page.tsx     # Memory Tab
        ├── gaps/        # Gaps Tab
        ├── chats/       # Chats Tab
        └── interviews/  # Interviews Tab
```

---

## 页面布局

### 详情页 - 左右分栏

```
┌──────────────┬────────────────────────────┐
│ Left Panel   │ Right Panel                │
│ (1/3 width)  │ (2/3 width)                │
├──────────────┼────────────────────────────┤
│ Avatar       │ [Memory][Chats][Interviews]│
│ Name/Domain  │ [Gaps]                     │
│              │                            │
│ Sources List │ ─────────────────────────  │
│ • Source 1 ✓ │                            │
│ • Source 2 ✓ │ Tab Content Area           │
│              │                            │
│ [Process]    │                            │
│ [Add Sources]│                            │
└──────────────┴────────────────────────────┘
```

### Memory Tab

- 显示 Core Memory (Markdown 渲染)
- Working Memory 列表 (pending items)
- 操作: Extract Knowledge, Integrate Working Memory

### Gaps Tab

- Pending Gaps (显示对话来源、用户提问引用、严重程度)
- Resolved Gaps (显示解决方式、置信度、证据)
- 操作: Create Supplementary Interview (基于 pending gaps 生成访谈计划)

### Interviews Tab

- 访谈历史列表
- 显示状态、解决的 gaps 数量
- 点击查看访谈详情

---

## 实现状态

### ✅ 已完成

- 分层记忆架构 (Core/Working/Episodic)
- AI 智能 Gap 解决判断
- 访谈自动处理流程
- 对话中发现知识空白
- 版本控制策略
- 多 Tab 管理界面

### ⏳ 待实现

- Memory Document 版本历史 UI
- Working Memory 整合 UI
- 处理进度实时更新
- Tool 调用支持 (web search, research)
