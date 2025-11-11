# Sage (专家智能体) 系统设计文档

## 系统概述

Sage 是一个基于记忆管理的 AI 专家系统，通过分析知识源、构建记忆文档（Memory Document）、识别知识空白、进行补充访谈等方式，持续完善专家知识体系。

### 核心价值

- **记忆即专家**: 专家的核心是 Memory Document（类似 Claude Code 的 CLAUDE.md）
- **多源构建**: 支持文件、文本、URL 等多种知识源
- **渐进优化**: 通过初始分析 + 对话发现 + 补充访谈，持续完善知识
- **知识空白驱动**: 主动识别知识薄弱点，针对性补充

### 当前实现状态

**✅ 已完成的核心功能**:

1. **专家创建**: 支持多种知识源（文件/文本/URL）
2. **手动处理流程**: 3步独立操作（解析源 → 提取知识 → 分析空白）
3. **Memory Document**: 版本控制 + 来源追踪
4. **Knowledge Gaps**: 独立表存储 + 来源/解决追踪
5. **补充访谈**: AI 自动生成计划 + 结束后自动更新
6. **对话分析**: 异步识别知识空白（conversation gaps）
7. **公开主页**: 专家展示 + 推荐问题 + 对话入口
8. **管理界面**: 左右分栏布局 + Tab 导航（Memory/Gaps/Chats）

**⏳ 待实现功能**:

- Memory Document 版本历史 UI
- 实时处理进度更新
- Tool 调用支持（web search, deep research）
- 批量处理和自动化

---

## 数据模型

### Sage (专家)

- 核心字段：name, domain, expertise, locale
- **memoryDocument**: Markdown 格式的核心知识文档（指向最新版本的内容）
- **embedding**: 向量嵌入（用于检索和匹配）
- **extra.processing**: 处理状态追踪
- **extra.knowledgeAnalysis**: 知识分析结果（7维度评分）

### MemoryDocumentVersion (记忆文档版本)

- 每个 Sage 的 Memory Document 版本历史
- **version**: 版本号，自增（乐观锁保证串行）
- **content**: 版本内容
- **source**: "initial" | "interview" | "manual"（来源类型）
- **sourceReference**: 来源引用（如 interviewId）
- **changeNotes**: 变更说明
- 每个 Sage 保留最新 20 个版本
- 联合索引 `(sageId, version DESC)` 优化查询

### SageKnowledgeGap (知识空白)

- 独立的知识空白记录表
- **area**: 知识领域
- **description**: 缺失描述
- **severity**: "critical" | "important" | "nice-to-have"
- **impact**: 影响说明
- **sourceType**: "analysis" | "conversation" | "system_suggestion"
- **sourceDescription**: 来源描述（如"用户问了XXX问题"）
- **sourceReference**: 来源引用（如 userChatId）
- **status**: "pending" | "resolved" | "deleted"
- **resolvedBy**: "interview" | "manual"
- **resolvedByInterviewId**: 解决该 gap 的访谈 ID
- 索引：`(sageId, status)`, `(sageId, createdAt)`

### SageSource (知识源)

- 一个 Sage 对应多个 Source
- **type**: "text" | "file" | "url"
- **content**: 文本内容或文件/URL 信息
- **status**: "pending" | "processing" | "completed" | "failed"
- **extractedText**: 提取的纯文本内容
- **title**: AI 生成的标题
- 处理状态独立追踪，支持增量添加
- 使用 Jina API 解析文件和 URL

### SageChat (专家对话)

- 用户与专家的咨询对话
- 关联 UserChat 管理消息
- 对话后可能通过 AI 分析产生新的 SageKnowledgeGap 记录

### SageInterview (补充访谈)

- 针对知识空白的补充访谈
- **purpose**: 访谈目的
- **focusAreas**: 关注领域（来自知识空白）
- **extra.interviewPlan**: AI 生成的访谈计划（包含预设问题）
- 访谈创建时基于所有 pending gaps 生成问题
- 访谈结束后自动 resolve 相关 gaps，并创建新的 Memory Document 版本

---

## 核心功能流程

### 1. 创建专家 & 添加知识源

#### 页面 1: 创建专家 (`/sage/create`)

```
┌─────────────────────────────────────┐
│      Create Your Expert              │
│                                     │
│  Name: [输入框]                      │
│  Domain: [输入框]                    │
│                                     │
│  [文件上传区域]                      │
│   Drag & drop or choose file        │
│   支持: PDF, .txt, Markdown,        │
│         Audio, .docx               │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │ Website  │  │Paste text│        │
│  │添加网页URL│  │直接粘贴文本│       │
│  └──────────┘  └──────────┘        │
│                                     │
│  Source limit: 0/10                 │
│                                     │
│  [Cancel] [Create Expert]           │
└─────────────────────────────────────┘
```

**交互流程**:

1. 用户填写专家名称和领域
2. 用户上传文件/粘贴文本（Website 暂不实现）
3. 前端收集所有 sources
4. 点击"Create Expert" → 调用 `createSage()` server action
5. 创建 Sage + 创建多个 SageSource 记录
6. 跳转到详情页（**不自动触发处理**）

#### 后台处理流程（手动触发 - 3 步独立操作）

**重要变更**: 创建专家后**不自动处理**，需要用户在详情页手动触发每个步骤

```
Step 1: 解析知识源 (processSourcesOnly)
  手动触发: 详情页 Sources Panel 点击 "Process All Sources"

  For each SageSource (extractedText === ""):
    - file: 使用 Jina API 解析（支持 PDF 等）
    - text: 直接使用
    - url: 使用 Jina API 抓取和解析

  结果: 每个 source 的 extractedText 字段填充

Step 2: 提取知识并构建 Memory Document (extractKnowledgeOnly)
  手动触发: Memory Tab 点击 "Extract Knowledge" 按钮
  前置条件: 至少一个 source 处理完成

  AI 调用 1: generateSageProfile (claude-sonnet-4-5)
    - 生成专家简介 (bio)
    - 生成推荐问题列表 (recommendedQuestions)
    - 提取专长领域 (expertise)

  AI 调用 2: streamMemoryDocument (claude-sonnet-4-5)
    - 使用所有 source 的 extractedText
    - 生成结构化 Markdown Memory Document
    - 流式返回内容

  保存: createSageMemoryDocument
    - 创建 SageMemoryDocument 记录 (version: 1)
    - extra.source = { type: "initial" }

Step 3: 知识分析 (analyzeKnowledgeOnly)
  手动触发: Memory Tab 点击 "Analyze" 按钮
  前置条件: Memory Document 已创建

  AI 调用: analyzeKnowledgeGaps (gpt-4o)
    - 分析 Memory Document 内容
    - 识别知识空白

  保存: createSageKnowledgeGaps
    - 批量创建 SageKnowledgeGap 记录
    - source = { type: "analysis" }
    - resolvedAt = null (pending 状态)
```

**设计理念**:

- 🎯 **手动控制**: 用户完全控制处理时机和流程
- 💰 **成本透明**: 每个步骤需要手动触发，避免意外消耗
- 🔄 **独立重试**: 每个步骤可独立重试，失败不影响已完成步骤
- 📊 **即时反馈**: 每个步骤完成后立即看到结果

**UI 按钮状态**:

```typescript
// Memory Tab 按钮逻辑
canExtract = !hasMemoryDocument && (至少一个 source 已处理)
canAnalyze = hasMemoryDocument

// 禁用状态
Extract Button: disabled when (!canExtract || isExtracting)
Analyze Button: disabled when (!canAnalyze || isAnalyzing)
```

### 2. 详情页 - 左右分栏布局

#### 页面 2: Sage 详情页 (`/sage/[sageToken]`)

**布局结构**: 左右分栏设计

```
┌─────────────────────────────────────────────────────┐
│ Left Panel (1/3)  │  Right Panel (2/3)              │
│ ──────────────────┼─────────────────────────────────│
│ [Sources Panel]   │ [Tab Navigation]                │
│                   │ • Memory                        │
│ Avatar + Info     │ • Gaps                          │
│ • Name            │ • Chats                         │
│ • Domain          │                                 │
│ • Upload Avatar   │ ─────────────────────────────── │
│                   │ [Tab Content Area]              │
│ Sources List      │                                 │
│ • Source 1 ✓      │ (当前选中 Tab 的内容)            │
│ • Source 2 ⏳     │                                 │
│ • Source 3 ✓      │                                 │
│                   │                                 │
│ [Process All]     │                                 │
│ [Add Sources]     │                                 │
└───────────────────┴─────────────────────────────────┘
```

#### 左侧面板: Sources Panel

**头部区域**:

- 头像（可点击上传）
- 专家名称 + 领域
- 统计数据（聊天数、访谈数）

**知识源列表**:

```typescript
// 每个 source 显示
{
  title: string, // 文件名或 AI 生成标题
  type: "text" | "file" | "url",
  status: extractedText ? "completed" : "pending",
  preview: extractedText.substring(0, 100) + "...",
}
```

**操作按钮**:

- `Process All Sources` - 批量处理所有未处理的源
- `Add More Sources` - 添加新的知识源

#### 右侧面板: Tab 系统

##### Tab 1: Memory (`/sage/[sageToken]`)

```
┌─────────────────────────────────────┐
│ [Extract Knowledge] [Analyze]       │
├─────────────────────────────────────┤
│                                     │
│ # Expert Profile                    │
│                                     │
│ **Name**: John Doe                  │
│ **Domain**: UX Design               │
│ **Expertise**: User Research, ...   │
│                                     │
│ ## Bio                              │
│ John is a seasoned UX designer...   │
│                                     │
│ ## Core Knowledge                   │
│ ...                                 │
│                                     │
│ (Markdown 渲染后的内容)              │
└─────────────────────────────────────┘
```

**功能**:

- `Extract Knowledge` 按钮: 构建 Memory Document
- `Analyze` 按钮: 分析知识空白
- 显示最新版本的 Memory Document（Markdown 渲染）
- 支持公开链接分享

##### Tab 2: Gaps (`/sage/[sageToken]/gaps`)

```
┌─────────────────────────────────────┐
│ Knowledge Gaps                      │
│ 2 pending, 1 resolved               │
│ [Create Supplementary Interview]    │
├─────────────────────────────────────┤
│ Pending Gaps                        │
│                                     │
│ ┌─ 💬 User asked:                  │
│ │ "你对 Midjourney 有什么看法？"    │
│ │ [View Chat →]                     │
│ ├─────────────────────────────────  │
│ │ ⚠️ AI 辅助设计工具 [critical]     │
│ │ 专家对主流 AI 设计工具了解有限    │
│ │ Impact: 无法给出专业建议          │
│ └─────────────────────────────────  │
│                                     │
│ Resolved Gaps                       │
│ ✓ 用户研究方法论 [resolved]         │
│   Resolved by: Interview #123       │
└─────────────────────────────────────┘
```

**功能**:

- 展示 pending 和 resolved gaps
- conversation 类型显示用户提问引用
- 点击 `Create Supplementary Interview` 创建访谈
- 显示解决方式（interview / manual）

##### Tab 3: Chats (`/sage/[sageToken]/chats`)

```
┌─────────────────────────────────────┐
│ User Chat History                   │
│ 5 total chats                       │
├─────────────────────────────────────┤
│ Design System Guidelines            │
│ 2 hours ago                         │
│ "How should I structure..."         │
│ [View →]                            │
├─────────────────────────────────────┤
│ User Research Best Practices        │
│ 1 day ago                           │
│ "What are the key steps..."         │
│ [View →]                            │
└─────────────────────────────────────┘
```

**功能**:

- 展示所有用户与该专家的对话记录
- 点击查看对话完整内容（`/sage/chat/view/[token]`）

### 3. 知识空白的三个来源

#### 来源 1: 初始知识分析

- 用户在 Memory Tab 点击 `Analyze` 按钮
- AI 分析 Memory Document 内容（gpt-4o）
- 识别知识薄弱领域和缺失点
- 生成初始知识空白列表
- **存储**:
  ```typescript
  source: {
    type: "analysis";
  }
  resolvedAt: null; // pending 状态
  ```

#### 来源 2: 对话中发现（核心创新）

```
用户与专家对话 (SageChat) →
  对话完成后异步分析 (after pattern) →
    analyzeConversationForGaps() →
      检测专家回答薄弱点 →
        生成新的 SageKnowledgeGap
```

**实现方式**:

- API: `/api/chat/sage/route.ts`
- 在 `after()` 中异步调用分析
- AI 检测回答质量和知识缺失
- 自动创建 gap 记录
- **存储**:
  ```typescript
  source: {
    type: "conversation",
    userChatToken: "xxx", // 关联的聊天 token
    quote: "用户问了什么问题" // 用户提问的引用
  }
  resolvedAt: null
  ```

**UI 展示特性**:

- Gap 卡片顶部显示用户提问引用
- 点击链接跳转到原始对话查看
- 帮助专家 owner 理解 gap 来源

#### 来源 3: 系统建议（预留）

- 系统定期分析或人工添加
- **存储**:
  ```typescript
  source: {
    type: "system_suggestion";
  }
  ```

### 4. 补充访谈流程

#### 触发方式

1. Gaps Tab 点击 `Create Supplementary Interview` 按钮
2. 调用 `createSupplementaryInterview(sageId)` server action
3. **前置检查**:
   - 必须有 pending 状态的 SageKnowledgeGaps
   - 如果没有，返回错误提示
4. **自动流程**:
   - 查询所有 pending gaps
   - 调用 AI 生成访谈计划（claude-sonnet-4）
   - 创建 UserChat（kind: "sageSession"）
   - 创建 SageInterview 记录
   - 跳转到访谈页面

#### 访谈计划生成

```typescript
// generateInterviewPlan()
{
  purpose: "填补 AI 设计工具和用户研究方法的知识空白",
  focusAreas: ["AI 设计工具", "用户研究方法"],
  questions: [
    {
      question: "你在项目中使用过哪些 AI 设计工具？",
      purpose: "了解实践经验",
      followUps: [
        "这些工具在哪些场景下最有效？",
        "遇到过什么限制或挑战？"
      ]
    },
    // ... 更多问题
  ]
}
```

#### 访谈界面 (`/sage/interview/[userChatToken]`)

```
┌─────────────────────────────────────┐
│ Supplementary Interview             │
│ Filling Knowledge Gaps              │
├─────────────────────────────────────┤
│                                     │
│  AI: 你在项目中使用过哪些 AI 设计   │
│      工具？具体的应用场景是什么？    │
│                                     │
│  You: 我主要使用 Midjourney...      │
│                                     │
│  AI: 很好，那这些工具在哪些场景下   │
│      最有效呢？                      │
│                                     │
│  [输入框]                            │
│  [📎 附件]                          │
│                                     │
└─────────────────────────────────────┘
```

#### 访谈进行中

- API: `/api/chat/sage-interview/route.ts`
- 系统提示词：使用预生成的 interviewPlan
- AI Tools:
  - `endInterview`: AI 判断何时结束访谈
    - 参数: `summary` (访谈总结)
    - 触发后台更新流程

#### 访谈结束后的自动处理

```typescript
// endInterview tool 触发
1. 标记 interview 为已完成
   extra.ongoing = false
   extra.completedAt = Date.now()

2. 后台触发 (waitUntil)
   updateMemoryDocumentFromInterview({
     sageId,
     interviewId,
     locale,
   })

3. 更新 Memory Document
   - 获取访谈所有消息
   - AI 分析并更新 Memory Document
   - 创建新版本 (version++)
   - extra.source = {
       type: "interview",
       userChatToken: "xxx"
     }

4. 解决相关 gaps
   - AI 分析哪些 gap 被解决
   - 批量调用 resolveSageKnowledgeGaps()
   - 设置 resolvedAt 和 resolvedBy
   resolvedBy: {
     type: "interview",
     userChatToken: "xxx"
   }
```

### 5. 专家对话（用户咨询）

#### 私有对话 (`/sage/chat/[userChatToken]`)

- Owner 与自己的专家对话（测试用）
- 使用标准聊天组件
- API: `/api/chat/sage/route.ts`
- 对话后异步分析，可能生成新的 knowledge gaps

#### 公开专家主页 (`/sage/profile/[sageToken]`)

```
┌─────────────────────────────────────┐
│ [Avatar]  John Doe                  │
│           UX Design Expert          │
│                                     │
│ Bio: John is a seasoned designer... │
│                                     │
│ Expertise:                          │
│ • User Research                     │
│ • Design Systems                    │
│ • Prototyping                       │
│                                     │
│ [Start Conversation]                │
│                                     │
│ Recommended Questions:              │
│ ┌─────────────────────────────────┐ │
│ │ 如何进行有效的用户研究？         │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 设计系统如何提升团队效率？       │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 原型设计的最佳实践是什么？       │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**功能特性**:

1. **未登录用户**: 点击按钮跳转到登录页
2. **已登录用户**: 点击创建新的 SageChat
   - 如果点击推荐问题，带上问题作为第一条消息
   - 跳转到 `/sage/chat/[userChatToken]`
3. **自动分析**: 每次对话后，AI 异步分析是否产生新的 knowledge gap

#### 对话查看页面 (`/sage/chat/view/[userChatToken]`)

- 专家 Owner 查看用户聊天记录的只读页面
- 显示完整对话历史（用户 + AI 回复）
- 文档样式的干净布局
- 用于 Knowledge Gap 溯源（从 gap 点击链接跳转）

---

## Knowledge Gap 管理

### Gap 数据结构

```typescript
SageKnowledgeGap {
  id: number
  sageId: number
  area: string              // 知识领域
  description: string       // 缺失描述
  severity: "critical" | "important" | "nice-to-have"
  impact: string            // 影响说明

  // 来源追踪
  source: {
    type: "analysis" | "conversation" | "system_suggestion"
    userChatToken?: string  // conversation 类型专用
    quote?: string          // 用户提问引用
  }

  // 解决追踪
  resolvedAt: DateTime | null
  resolvedBy: {
    type: "interview" | "manual"
    userChatToken?: string  // interview 类型专用
  }
}
```

### Gap 状态流转

```
创建 (resolvedAt = null)
  ↓
  ├→ Interview 结束自动分析 →
  │    resolvedAt = now()
  │    resolvedBy = { type: "interview", userChatToken: "xxx" }
  │
  └→ 手动标记已解决 →
       resolvedAt = now()
       resolvedBy = { type: "manual" }
```

### Gap 核心函数

#### 1. 创建 Gaps

```typescript
// lib.ts
export async function createSageKnowledgeGaps(
  gaps: Array<{
    sageId: number;
    area: string;
    description: string;
    severity: SageKnowledgeGapSeverity;
    impact: string;
    source: SageKnowledgeGapSource;
  }>,
): Promise<void>;
```

#### 2. 查询 Gaps

```typescript
// 获取所有 pending gaps (resolvedAt = null)
const gaps = await getPendingSageKnowledgeGaps(sageId);

// 获取所有 gaps（含已解决）
const allGaps = await prisma.sageKnowledgeGap.findMany({
  where: { sageId },
  orderBy: { createdAt: "desc" },
});
```

#### 3. 解决 Gaps

```typescript
// 批量解决 gaps
export async function resolveSageKnowledgeGaps(
  gapIds: number[],
  resolvedBy: SageKnowledgeGapResolvedBy,
): Promise<void>;

// 使用示例 - Interview 结束后
await resolveSageKnowledgeGaps([1, 2, 3], { type: "interview", userChatToken: "xxx" });
```

---

## 关键技术实现

### 1. Knowledge Gaps 独立表 + 来源/解决追踪

**设计**: 使用独立 `SageKnowledgeGap` 表，非 JSON 字段

**优势**:

- `resolvedAt` 字段区分 pending/resolved 状态
- `source` JSON 字段支持多种来源类型和追踪信息
- `resolvedBy` JSON 字段追踪解决方式
- 高效查询和统计（索引优化）
- conversation 类型 gap 显示用户提问引用

### 2. Memory Document 版本控制

**实现**: 版本号自增 + 保留最新 20 版本

```typescript
// 创建新版本 (lib.ts)
export async function createSageMemoryDocument({
  sageId,
  content,
  changeNotes,
  extra,
}: {
  sageId: number;
  content: string;
  changeNotes: string;
  extra: SageMemoryDocumentExtra;
}): Promise<SageMemoryDocument> {
  // 获取最新版本号
  const latestDoc = await prisma.sageMemoryDocument.findFirst({
    where: { sageId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const newVersion = (latestDoc?.version ?? 0) + 1;

  // 创建新版本
  const doc = await prisma.sageMemoryDocument.create({
    data: {
      sageId,
      version: newVersion,
      content,
      changeNotes,
      extra,
    },
  });

  // 清理旧版本（保留最新 20 个）
  await cleanupOldVersions(sageId);

  return doc;
}
```

**版本来源追踪**:

```typescript
extra.source =
  | { type: "initial" }                           // 首次创建
  | { type: "manual" }                            // 手动编辑
  | { type: "interview", userChatToken: "xxx" }   // 访谈更新
```

### 3. Source 处理（Jina API 集成）

**实现**: `processing/sources.ts`

```typescript
async function processSingleSource(source: SageSource) {
  const { type, content } = source.content;

  if (type === "text") {
    // 直接使用文本
    return content.text;
  }

  if (type === "file") {
    // 生成 S3 签名 URL
    const signedUrl = await s3SignedUrl(content.objectUrl);
    // 调用 Jina Reader API
    return await jinaReaderAPI(signedUrl);
  }

  if (type === "url") {
    // 直接发送 URL 给 Jina
    return await jinaReaderAPI(content.url);
  }
}
```

**特点**:

- 每个 source 独立处理
- `extractedText === ""` 判断是否已处理
- 失败不影响其他 sources
- 支持增量添加和重试

### 4. 对话后自动分析 Gap（After Pattern）

**实现**: `/api/chat/sage/route.ts`

```typescript
// AI 流式响应结束后
after(
  result.consumeStream().then(async () => {
    try {
      // 异步调用 Gap 分析
      const newGaps = await analyzeConversationForGaps({
        messages: dbMessages,
        currentMessagePair: {
          user: userMessage,
          assistant: assistantText,
        },
        memoryDocument: sage.latestMemoryDocument,
        locale,
      });

      if (newGaps.length > 0) {
        await createSageKnowledgeGaps(
          newGaps.map((gap) => ({
            ...gap,
            sageId: sage.id,
            source: {
              type: "conversation",
              userChatToken: userChat.token,
              quote: userMessage.substring(0, 200),
            },
          })),
        );
      }
    } catch (error) {
      logger.error({ msg: "Gap analysis failed", error });
    }
  }),
);
```

### 5. Interview 工具自动处理

**Tools**: `tools.ts`

```typescript
const endInterviewTool = ({ interviewId }) =>
  tool({
    description: "End interview when all questions answered",
    inputSchema: z.object({
      summary: z.string(),
    }),
    execute: async ({ summary }) => {
      // 标记完成
      await updateInterview(interviewId, {
        ongoing: false,
        summary,
      });

      // 后台触发更新
      waitUntil(
        updateMemoryDocumentFromInterview({
          sageId,
          interviewId,
          locale,
        }),
      );

      return { success: true };
    },
  });
```

**自动流程**:

1. AI 调用 `endInterview` tool
2. 后台获取访谈消息
3. AI 生成更新后的 Memory Document
4. AI 分析哪些 gap 被解决
5. 批量更新 gap 状态

---

## 实现优先级

### P0 (核心架构 - 已完成 ✅)

1. ✅ 创建 SageSource schema 和 migration
2. ✅ 创建 SageKnowledgeGap 独立表
3. ✅ 创建 SageMemoryDocument 版本表
4. ✅ 实现 source 处理管道（file + text + url）
5. ✅ 创建知识源添加页面 UI
6. ✅ 更新详情页展示 sources 状态
7. ✅ 实现 Jina API 集成（文件和 URL 解析）

### P1 (核心功能 - 已完成 ✅)

8. ✅ Memory Document 版本控制
9. ✅ Knowledge Gap 创建和管理
10. ✅ Interview 基于 pending gaps 生成
11. ✅ Interview 结束自动 resolve gaps
12. ✅ 对话分析识别知识空白（集成到 chat API）
13. ✅ 公开专家页面（含推荐问题功能）
14. ✅ 简化处理流程（3步AI调用：处理内容 → 构建文档 → 分析知识）
15. ✅ 手动处理触发机制（创建后需手动点击处理）
16. ✅ 表重命名保持一致性（所有表以 Sage 为前缀）

### P2 (UI 和体验优化 - 已完成 ✅)

17. ✅ Knowledge Gap 列表 UI（展示来源、严重程度、解决状态）
18. ✅ Gap 来源追踪展示（conversation 类型显示用户提问）
19. ✅ Interview 关联的 gaps 展示（resolved by interview）
20. ✅ 聊天记录查看页面（`/sage/chat/view/[token]`）
21. ✅ 头像上传功能（Avatar Upload）
22. ✅ 专家个人资料自动生成（bio + recommendedQuestions）
23. ✅ Tab 导航系统（Memory / Gaps / Chats）

### P3 (待实现功能)

24. ⏳ Memory Document 版本历史 UI（目前只显示最新版本）
25. ⏳ 处理进度实时更新（WebSocket/SSE）
26. ⏳ Tool 调用支持（deep research, web search）
27. ⏳ 批量处理多个 Sage
28. ⏳ 定期自动创建 Interview（cron job）
29. ⏳ 处理失败通知（邮件/站内信）
30. ⏳ 权限精细化控制（公开/私有切换）

---

## 文件结构

```
src/app/(sage)/
├── README.md                        # 本文档
├── types.ts                         # TypeScript 类型定义
├── lib.ts                           # 核心工具函数（CRUD operations）
├── actions.ts                       # Server Actions（API 入口）
├── tools.ts                         # AI Tools 定义（endInterview）
├── tools/
│   └── ui.tsx                      # 工具 UI 渲染
│
├── processing/                     # 处理逻辑模块
│   ├── sources.ts                  # 知识源解析（Jina API）
│   ├── memory.ts                   # Memory Document 构建和更新
│   ├── gaps.ts                     # Knowledge Gap 分析
│   └── followup.ts                 # 访谈计划生成
│
├── prompt/                         # AI 提示词模板
│   ├── chat.ts                     # 对话和访谈系统提示词
│   ├── memory.ts                   # Memory Document 构建提示词
│   └── gaps.ts                     # Gap 分析提示词
│
├── messages/                       # 国际化文案
│   ├── en-US.json
│   └── zh-CN.json
│
├── (chat)/                         # 对话相关路由
│   ├── api/chat/
│   │   ├── sage/route.ts          # 专家对话 API
│   │   └── sage-interview/route.ts # 补充访谈 API
│   ├── layout.tsx                  # 对话布局
│   └── sage/
│       ├── chat/
│       │   ├── [userChatToken]/
│       │   │   ├── page.tsx       # 对话界面
│       │   │   └── SageChatClient.tsx
│       │   └── view/[userChatToken]/
│       │       └── page.tsx       # 对话查看页（只读）
│       └── interview/[userChatToken]/
│           ├── page.tsx           # 访谈界面
│           └── SageInterviewClient.tsx
│
├── (public)/                       # 公开页面
│   ├── layout.tsx
│   ├── sage/
│   │   ├── page.tsx               # 专家列表/首页
│   │   ├── SageHomePageClient.tsx
│   │   ├── create/
│   │   │   ├── page.tsx          # 创建专家
│   │   │   └── CreateSageForm.tsx
│   │   └── profile/[sageToken]/
│   │       ├── page.tsx          # 公开专家主页
│   │       └── PublicSageView.tsx
│   └── sages/
│       ├── page.tsx               # 专家列表（备用）
│       └── SagesListClient.tsx
│
└── sage/                          # 专家管理界面
    ├── layout.tsx                 # 管理布局
    └── [sageToken]/
        ├── layout.tsx             # 详情页布局（左右分栏）
        ├── page.tsx               # Memory Tab（默认）
        ├── MemoryTab.tsx
        ├── AvatarUpload.tsx
        ├── SourcesPanel.tsx       # 左侧源列表
        ├── TabNavigation.tsx
        ├── gaps/
        │   ├── page.tsx          # Gaps Tab
        │   └── GapsTab.tsx
        └── chats/
            ├── page.tsx          # Chats Tab
            └── ChatsTab.tsx
```

---

## AI 模型使用策略

### 核心处理流程（手动触发）

#### Step 2: 知识提取 (extractKnowledgeOnly)

**AI 调用 1**: 生成专家资料

- 模型: `claude-sonnet-4-5`
- 函数: `generateSageProfile`
- 输出: `{ bio, recommendedQuestions, expertise }`

**AI 调用 2**: 构建 Memory Document

- 模型: `claude-sonnet-4-5`
- 函数: `streamMemoryDocument` (流式)
- 输入: 所有 sources 的 extractedText
- 输出: 结构化 Markdown 文档

#### Step 3: 知识分析 (analyzeKnowledgeOnly)

- 模型: `gpt-4o`
- 函数: `analyzeKnowledgeGaps`
- 输入: Memory Document
- 输出: Knowledge Gaps 列表

### 对话系统

#### 专家对话 (`/api/chat/sage`)

- 模型: `claude-sonnet-4-5`
- 系统提示词: `sageChatSystem`
- 输入: Memory Document + 对话历史
- 工具: 无

#### 补充访谈 (`/api/chat/sage-interview`)

- 模型: `claude-sonnet-4-5`
- 系统提示词: `sageInterviewSystem`
- 输入: Interview Plan + Memory Document
- 工具:
  - `endInterview`: 结束访谈

### 辅助分析

#### 对话质量分析（异步）

- 模型: `gemini-2.5-flash` (成本低)
- 函数: `analyzeConversationForGaps`
- 触发: 每次对话结束后（after pattern）
- 输出: 可能的新 Knowledge Gaps

#### 访谈计划生成

- 模型: `claude-sonnet-4`
- 函数: `generateInterviewPlan`
- 输入: Sage info + pending gaps
- 输出: Interview Plan 结构

#### Memory Document 更新（Interview 后）

- 模型: `claude-sonnet-4-5`
- 函数: `updateMemoryDocumentFromInterview`
- 输入: 原 Memory Document + Interview 消息
- 输出:
  - 更新后的 Memory Document
  - 哪些 gaps 被解决

### 成本优化策略

- ✅ **手动触发**: 避免自动处理，降低意外消耗
- ✅ **流式响应**: Memory Document 构建使用流式，提升体验
- ✅ **轻量分析**: 对话 Gap 分析使用 gemini-2.5-flash
- ✅ **后台处理**: Interview 更新使用 waitUntil 异步
