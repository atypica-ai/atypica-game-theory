# Sage (专家智能体) 系统文档

## 系统概述

Sage 是基于分层记忆管理的 AI 专家系统,通过知识源构建、知识空白识别、补充访谈等方式持续完善专家知识体系。

**核心特性**:

- 分层记忆架构 (Core / Working / Episodic)
- 知识空白驱动的主动学习
- 多源知识整合
- 版本控制的记忆管理

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
  recommendedQuestions: string[]  // 推荐问题
  embedding: number[]        // 向量嵌入
}
```

### SageMemoryDocument (分层记忆文档)

```prisma
model SageMemoryDocument {
  sageId      Int
  version     Int              // 版本号,仅在整合 working 到 core 时递增

  // 分层记忆
  core        String @db.Text  // 核心记忆 (Markdown)
  working     Json   @default("[]")  // 工作记忆 (待整合的新知识)
  episodic    Json   @default("[]")  // 情景记忆 (对话引用)

  changeNotes String
  extra       Json             // 来源追踪

  @@unique([sageId, version])
}
```

#### 分层记忆结构

**Core Memory (核心记忆)**:

- 稳定的、经过验证的核心知识
- Markdown 格式,结构化文档
- 很少更新,除非整合 Working Memory

**Working Memory (工作记忆)**:

```typescript
type WorkingMemoryItem = {
  id: string;
  content: string; // 知识内容 (Markdown)
  source: "interview" | "conversation";
  sourceId: string; // interviewId 或 userChatToken
  relatedGapIds?: number[]; // 解决的 Gap IDs
  status: "pending" | "integrated" | "discarded";
};
```

**Episodic Memory (情景记忆)**:

- 只存储 chatId (userChatToken)
- 用于追溯对话历史和验证知识来源

#### 版本控制策略

**版本递增时机**:

- ✅ 整合 Working Memory 到 Core Memory
- ✅ 手动编辑 Core Memory
- ❌ 添加 Working Memory (不递增版本)
- ❌ 添加 Episodic Memory (不递增版本)

### SageKnowledgeGap (知识空白)

```typescript
{
  sageId: number
  area: string                 // 知识领域
  description: string
  severity: "critical" | "important" | "nice-to-have"
  impact: string

  // 来源追踪
  source: {
    type: "analysis" | "conversation" | "system_suggestion"
    userChatToken?: string     // conversation 类型专用
    quote?: string             // 用户提问引用
  }

  // 解决追踪
  resolvedAt: Date | null
  resolvedBy?: {
    type: "interview" | "manual"
    userChatToken?: string
  }

  // AI 分析结果
  extra: {
    resolutionConfidence?: number      // 0-1, 解决的置信度
    resolutionEvidence?: string[]      // 解决的证据引用
    missingAspects?: string[]          // 部分解决时的缺失方面
  }
}
```

### SageSource (知识源)

```typescript
{
  sageId: number;
  type: "text" | "file" | "url";
  content: {
    /* type-specific content */
  }
  extractedText: string; // Jina API 提取的文本
  title: string; // AI 生成的标题
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
手动触发: 处理知识源 (Jina API 提取文本)
  ↓
手动触发: 提取知识 (AI 生成 bio, questions, core memory)
  - 创建 SageMemoryDocument (version: 1)
  - core: 初始知识文档
  - working: []
  - episodic: []
  ↓
手动触发: 分析知识空白
  - 创建 SageKnowledgeGap 记录
  - source: { type: "analysis" }
```

### 2. 对话中发现知识空白

```
用户与 Sage 对话
  ↓
对话结束后异步分析 (after pattern)
  ↓
AI 检测回答薄弱点
  ↓
创建新的 SageKnowledgeGap
  - source: { type: "conversation", userChatToken, quote }
  ↓
UI 展示: Gap 卡片显示用户提问引用,点击跳转到原对话
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
  - episodic: [..., interviewChatToken]
  ↓
更新 SageKnowledgeGap:
  - resolvedAt: now()
  - resolvedBy: { type: "interview", userChatToken }
  - extra.resolutionConfidence: 0.85
  - extra.resolutionEvidence: ["访谈引用1", "访谈引用2"]
```

### 4. 整合 Working Memory 到 Core

```
用户在 Memory Tab 查看 working memory 列表
  ↓
点击 "整合到核心记忆" 按钮
  ↓
AI 分析 working items → 更新 core memory 相关章节
  ↓
创建新版本:
  - version: version + 1
  - core: 更新后的内容
  - working: []  (清空)
  - episodic: 保持不变
  - changeNotes: "整合了 3 条工作记忆"
```

### 5. 对话时的记忆使用

```
用户提问
  ↓
构建系统提示词:
  - Core Memory (稳定知识)
  - Working Memory (最近补充的知识)
  - Relevant Episodic Memory (相关对话历史)
  ↓
AI 生成回答
  ↓
异步分析: 是否产生新的 knowledge gap
```

---

## 知识空白的三个来源

### 来源 1: 初始分析

- 用户点击 "Analyze" 按钮
- AI 分析 core memory,识别薄弱领域
- source: `{ type: "analysis" }`

### 来源 2: 对话中发现 (核心创新)

- 每次对话后异步分析
- AI 检测回答质量和知识缺失
- source: `{ type: "conversation", userChatToken, quote }`
- UI 显示用户提问引用,可点击跳转

### 来源 3: 系统建议 (预留)

- 系统定期分析或人工添加
- source: `{ type: "system_suggestion" }`

---

## 关键技术实现

### 1. AI 智能 Gap 解决判断

替换简单的字符串匹配,使用 AI 深度分析:

```typescript
await analyzeGapResolution({
  gaps,                      // pending gaps
  interviewTranscript,       // 访谈内容
  originalMemory,           // 访谈前的 core memory
  updatedMemory,            // 更新后的 core memory
})

// 返回:
{
  resolved: [{               // 完全解决 (confidence >= 0.8)
    gapId,
    confidence: 0.85,
    reasoning: "访谈提供了详细的...",
    evidenceQuotes: ["引用1", "引用2"]
  }],
  partiallyResolved: [{      // 部分解决 (0.3-0.8)
    gapId,
    confidence: 0.6,
    reasoning: "访谈涉及了该领域但深度不够",
    missingAspects: ["缺少具体案例", "实践经验"]
  }],
  unresolved: [3, 5],        // 未解决 (< 0.3)
  newGapsDiscovered: [...]   // 发现的新 gaps
}
```

### 2. 分层记忆架构

**设计原则**:

- Core Memory: 稳定知识,很少更新
- Working Memory: 临时知识,等待整合
- Episodic Memory: 对话引用,用于溯源

**更新策略**:

- 新知识先进入 Working Memory (不递增版本)
- 定期或手动整合到 Core Memory (递增版本)
- Episodic Memory 记录对话 ID,按需查询详情

### 3. 访谈自动处理流程

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
4. 更新 gap 状态 (resolvedAt, confidence, evidence)
5. 添加 episodic reference
```

### 4. 对话后 Gap 分析

```typescript
// /api/chat/sage/route.ts
after(
  result.consumeStream().then(async () => {
    const newGaps = await analyzeConversationForGaps({
      messages,
      currentMessagePair: { user, assistant },
      memoryDocument,
      locale,
    });

    if (newGaps.length > 0) {
      await createSageKnowledgeGaps(
        newGaps.map((gap) => ({
          ...gap,
          source: {
            type: "conversation",
            userChatToken,
            quote: userMessage.substring(0, 200),
          },
        })),
      );
    }
  }),
);
```

---

## AI 模型使用策略

### 核心处理

- **构建 Memory Document**: `claude-sonnet-4-5`
- **分析知识空白**: `gpt-4o`
- **生成访谈计划**: `claude-sonnet-4`

### 对话系统

- **专家对话**: `claude-sonnet-4-5`
- **补充访谈**: `claude-sonnet-4-5`

### 辅助分析

- **对话 Gap 分析**: `gemini-2.5-flash` (成本优化)
- **Gap 解决判断**: `gpt-4o`
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

- Pending Gaps (显示来源、引用、严重程度)
- Resolved Gaps (显示解决方式、置信度、证据)
- 操作: Create Supplementary Interview

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
