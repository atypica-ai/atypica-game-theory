# Sage (专家智能体) 系统设计文档

## 概述

Sage 是一个基于记忆管理的 AI 专家系统，通过分析知识源、构建记忆文档（Memory Document）、识别知识空白、进行补充访谈等方式，持续完善专家知识体系。

## 核心理念

- **记忆即专家**: 专家的核心是 Memory Document（类似 Claude Code 的 CLAUDE.md）
- **多源构建**: 支持文件、文本、URL 等多种知识源
- **渐进优化**: 通过初始分析 + 对话发现 + 补充访谈，持续完善知识
- **知识空白驱动**: 主动识别知识薄弱点，针对性补充

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

#### 页面 1: 添加知识源 (`/sage/new` 或 `/sage`)
```
┌─────────────────────────────────────┐
│      添加知识源                      │
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
│  [取消] [下一步]                     │
└─────────────────────────────────────┘
```

**交互流程**:
1. 用户上传文件/粘贴文本（Website 暂不实现）
2. 前端收集所有 sources
3. 点击"下一步" → 调用 `createSage()` server action
4. 创建 Sage + 创建多个 SageSource 记录
5. 触发后台处理 → 跳转到详情页

#### 后台处理流程（简化版 - 3 步 AI 调用）
```
Step 1: 解析知识源 (processSource)
  For each SageSource:
    - file: 使用 Jina API 解析（支持 PDF 等）
    - text: 直接使用
    - url: 使用 Jina API 抓取和解析
    - 状态独立追踪：pending → processing → completed/failed
    - 支持部分失败：已成功的源可继续处理

Step 2: 提取知识并构建 Memory Document
  1. processInitialContent (AI: gemini-2.5-flash)
     - 提取关键知识点 (keyPoints)
     - 建议分类 (suggestedCategories)
     - 清洗内容 (extractedContent)

  2. buildMemoryDocument (AI: claude-sonnet-4-5)
     - 直接使用 extractedContent 构建 Memory Document
     - 生成结构化 Markdown
     - 整合专家信息和专长分类

  3. createMemoryDocumentVersion
     - 保存为首个版本 (source: "initial", version: 1)
     - 保留最新 20 个版本

Step 3: 知识分析
  1. analyzeKnowledgeCompleteness (AI: claude-sonnet-4)
     - 7 维度评分
     - 识别知识空白

  2. createSageKnowledgeGaps
     - 存入独立 SageKnowledgeGap 表
     - sourceType: "analysis"
     - status: "pending"
```

**优化说明**:
- ✅ **简化**: 移除了 extractMemories 和 embedding 生成步骤
- 💰 **节省**: AI 调用从 4 次减少到 3 次，无向量生成开销
- ⚡ **更快**: 减少一次 Claude Sonnet-4 调用和向量生成
- 🗑️ **清理**: 移除暂时不需要的 embedding 字段和相关代码

#### 断点续传（Resume from Failed Step）

处理流程支持从任何失败的步骤自动继续，避免重复执行已完成的步骤：

**Step 1 - 解析知识源**:
- 检查条件：`currentStep === "parse_content"` 或 `!currentStep`
- 只处理状态为 `pending` 的源
- 已完成（completed）或失败（failed）的源会被跳过
- 最后汇总所有 `completed` 状态的源继续处理

**Step 2 - 提取知识**:
- 检查条件：`!sage.memoryDocument` 或在 Step 1-2
- 如果 Memory Document 已存在，跳过此步骤
- 使用已完成源的 extractedText

**Step 3 - 知识分析**:
- 检查条件：`!sage.extra.knowledgeAnalysis.overallScore` 或在 Step 1-3
- 如果分析结果已存在，跳过
- 防止重复创建 SageKnowledgeGap（检查 sourceType="analysis" 的数量）

**重试机制**:
```typescript
// 用户点击「重新处理」按钮
retrySageProcessing(sageId)
  → 清除 extra.processing.error
  → 触发 processNewSage(sageId, locale)
  → 自动从失败的步骤继续
```

**场景示例**:
```
场景 1: Source 解析部分失败
- Source 1: ✅ completed
- Source 2: ✅ completed
- Source 3: ❌ failed (Jina API 超时)
→ 继续处理：用 Source 1+2 构建 Memory Document
→ 知识提取 ❌ 失败（AI 限流）
→ 用户点击重试
  → ✅ 跳过 Source 1, 2
  → 重试 Source 3
  → ✅ 继续知识提取

场景 2: 中途步骤失败
- Step 1-3: ✅ 已完成
- Step 4 (知识分析): ❌ 失败
→ 用户点击重试
  → ✅ 跳过 Step 1-3
  → 直接从 Step 4 继续
```

### 2. 详情页 - 处理状态与知识管理

#### 页面 2: Sage 详情页 (`/sage/[sageToken]`)

**左侧边栏**: 专家基本信息
- 名称、领域、专长
- 统计数据（对话数、访谈数）

**主区域 - Tab 切换**:

##### Tab 1: 知识源处理状态
```
Sources (3/3 processed)
┌────────────────────────────────┐
│ ✓ design-principles.pdf        │
│   Status: Completed            │
│   Extracted: 15 knowledge pts  │
├────────────────────────────────┤
│ ⏳ Product roadmap.txt         │
│   Status: Processing...        │
│   Progress: 60%                │
├────────────────────────────────┤
│ ✓ User research notes          │
│   Status: Completed            │
│   Extracted: 8 knowledge pts   │
└────────────────────────────────┘

[+ 添加更多知识源]
```

##### Tab 2: Memory Document (可编辑)
```
┌─────────────────┬─────────────────┐
│ Markdown Editor │ Preview         │
│                 │                 │
│ # Expert Profile│ (渲染后的预览)   │
│ - Name: ...     │                 │
│                 │                 │
│ ## Core Knowled │                 │
│ ...             │                 │
│                 │                 │
│ [保存修改]       │                 │
└─────────────────┴─────────────────┘
```

##### Tab 3: 知识分析
```
Overall Score: 75/100
━━━━━━━━━━━━━━━━━━━ 75%

7 维度评分:
├─ 基础理论知识      ████████░░ 80 (高)
├─ 实践经验         ██████░░░░ 60 (中)
├─ 行业洞察         ████████░░ 75 (高)
├─ 问题解决能力      ██████░░░░ 65 (中)
├─ 工具与方法论      ████░░░░░░ 40 (低) ⚠️
├─ 沟通表达能力      ███████░░░ 70 (中)
└─ 持续学习         ████████░░ 80 (高)

[重新分析]
```

##### Tab 4: 知识空白
```
系统分析了近期对话，发现以下知识空白。

┌─────────────────────────────────┐
│ AI 辅助设计工具          高优先级 │
│                                 │
│ "用户问：'你对 Midjourney 和    │
│  Figma AI 等工具有什么看法？'，  │
│  但专家回答显示对这些工具了解    │
│  有限。"                        │
│                                 │
│ 建议问题:                        │
│ • 你如何看待 AI 工具对设计工作   │
│   流的影响？                     │
│ • 你尝试过哪些 AI 设计工具？     │
│                                 │
│ [开始补充访谈]                   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ C端产品设计经验        中优先级  │
│ ...                             │
│ [开始补充访谈]                   │
└─────────────────────────────────┘
```

### 3. 知识空白的三个来源

#### 来源 1: 初始知识分析
- 创建 Sage 后，AI 分析 Memory Document
- 基于 7 维度评分，识别薄弱领域
- 生成初始知识空白列表
- **存储**: `sourceType: "analysis"`, `sourceDescription: "Initial knowledge analysis"`

#### 来源 2: 对话中发现（核心创新）
```
用户与专家对话 →
  AI 监控回答质量 (after) →
    发现回答不足/模糊/缺失 →
      生成新的 SageKnowledgeGap 记录
```

**实现方式**:
- 在 `/api/chat/sage` 中，after 异步分析对话
- 调用 `analyzeConversationForGaps()`
- 检测专家回答的薄弱点
- 调用 `createSageKnowledgeGaps()` 创建记录
- **存储**: `sourceType: "conversation"`, `sourceDescription: "User asked: XXX"`

#### 来源 3: 系统建议（预留）
- 系统定期分析或人工添加
- **存储**: `sourceType: "system_suggestion"`

### 4. 补充访谈

#### 触发方式
1. 详情页点击"开始补充访谈"按钮
2. 调用 `createSupplementaryInterview(sageId)`
3. **自动流程**:
   - 查询所有 pending 状态的 SageKnowledgeGaps
   - 如果没有 pending gaps，返回错误
   - 基于所有 pending gaps 生成访谈计划（AI）
   - 创建 SageInterview 记录，包含预设问题

#### 访谈界面 (`/sage/interview/[userChatToken]`)
使用 **FocusedInterviewChat** 组件:
```
┌─────────────────────────────────────┐
│ 补充访谈: 填补知识空白               │
│ Progress: ████████░░ 80%            │
│ Focus: AI 设计工具实践经验          │
├─────────────────────────────────────┤
│                                     │
│  [专注的访谈对话区域]                │
│                                     │
│  AI: 你在项目中使用过哪些 AI 设计   │
│      工具？具体的应用场景是什么？    │
│                                     │
│  [回答输入框]                        │
│  [🎤 语音] [📎 附件]                │
│                                     │
└─────────────────────────────────────┘
```

**后端实现**:
- API: `/api/chat/sage-interview`
- Tools: `endInterview`, `updateInterviewProgress`
- AI 根据访谈质量决定何时结束
- 结束时:
  1. 提取新知识，构建新的 Memory Document
  2. 保存为新版本 (createMemoryDocumentVersion)
  3. 自动分析哪些 gaps 被 resolved
  4. 批量更新 gap 状态为 resolved
  5. 重新生成 embedding

### 5. 专家对话（用户咨询）

#### 私有对话 (`/sage/chat/[userChatToken]`)
- Owner 与自己的专家对话
- 使用 **UserChatSession** 组件

#### 公开对话 (`/sage/[sageToken]/chat` 或 `/p/[sageToken]`)
- 公开专家的 Landing Page
- 任何人都可以对话
- 对话记录 owner 可在后台查看

---

## Knowledge Gap 管理

### Gap 状态流转
```
创建 (pending)
  ↓
  ├→ 用户点击"删除" → deleted
  ├→ 用户点击"已解决" → resolved (manual)
  └→ Interview 结束自动分析 → resolved (interview)
```

### Gap 操作

#### 1. 手动 Resolve
```typescript
// actions.ts
export async function resolveSageKnowledgeGap(gapId: number) {
  await resolveSageKnowledgeGaps([gapId], "manual");
}
```

#### 2. 删除 Gap
```typescript
export async function deleteSageKnowledgeGap(gapId: number) {
  await deleteSageKnowledgeGaps([gapId]);
}
```

#### 3. 查询 Gaps
```typescript
// 获取所有 pending gaps
const gaps = await getPendingSageKnowledgeGaps(sageId);

// 获取某个 sage 的所有 gaps（含已解决）
const allGaps = await prisma.sageKnowledgeGap.findMany({
  where: { sageId },
  orderBy: { createdAt: "desc" },
});
```

---

## 关键技术实现

### 1. Knowledge Gaps 独立表存储
**改进**: 从 JSON 字段迁移到独立表

**优势**:
- 独立状态管理（pending/resolved/deleted）
- 支持来源追踪和引用
- 支持高效查询和统计
- 支持关联 Interview 进行自动 resolution

### 2. Memory Document 版本控制
**实现**: 乐观锁 + 版本号自增

```typescript
// 创建新版本
const latestVersion = await getLatestVersion(sageId);
const newVersion = (latestVersion?.version ?? 0) + 1;

await prisma.memoryDocumentVersion.create({
  data: {
    sageId,
    version: newVersion,
    content: newContent,
    source: "interview",
    sourceReference: String(interviewId),
  },
});

// 清理旧版本（保留最新 20 个）
const oldVersions = await prisma.memoryDocumentVersion.findMany({
  where: { sageId },
  orderBy: { version: "desc" },
  skip: 20,
});

if (oldVersions.length > 0) {
  await prisma.memoryDocumentVersion.deleteMany({
    where: { id: { in: oldVersions.map(v => v.id) } },
  });
}
```

### 3. Source 独立处理（Jina API）
- 每个 SageSource 独立状态追踪
- **File**: 下载后发送签名 URL 给 Jina API
- **URL**: 直接发送 URL 给 Jina API
- **Text**: 不需要处理
- 支持增量添加，失败可重试

### 4. 对话质量监控（After Pattern）
```typescript
// In /api/chat/sage route.ts
after(
  streamTextResult.consumeStream().then(async () => {
    // 异步分析对话
    const gaps = await analyzeConversationForGaps({
      userMessage,
      aiResponse,
      sage,
      locale,
    });

    // 如果发现新的知识空白，创建记录
    if (gaps.length > 0) {
      await createSageKnowledgeGaps(
        gaps.map(gap => ({
          sageId,
          area: gap.area,
          description: gap.description,
          severity: gap.severity,
          impact: gap.impact,
          sourceType: "conversation",
          sourceDescription: `User asked: "${userMessage.substring(0, 100)}"`,
        }))
      );
    }
  })
);
```

### 5. Memory Document 编辑
- 简单的 Markdown 编辑器（左右分栏）
- 保存时调用 `createSageMemoryDocument()` 创建新版本
- 更新 Sage.memoryDocument 字段指向最新内容

---

## 实现优先级

### P0 (核心架构 - 已完成)
1. ✅ 创建 SageSource schema 和 migration
2. ✅ 创建 SageKnowledgeGap 独立表
3. ✅ 创建 SageMemoryDocument 版本表
4. ✅ 实现 source 处理管道（file + text + url）
5. ✅ 创建知识源添加页面 UI
6. ✅ 更新详情页展示 sources 状态
7. ✅ 实现 Jina API 集成（文件和 URL 解析）

### P1 (核心功能 - 已完成)
8. ✅ Memory Document 版本控制
9. ✅ Knowledge Gap 创建和管理
10. ✅ Interview 基于 pending gaps 生成
11. ✅ Interview 结束自动 resolve gaps
12. ✅ 对话分析识别知识空白
13. ✅ 公开专家页面
14. ✅ 简化处理流程（移除 extractMemories 和 embedding）
15. ✅ 断点续传和重试机制
16. ✅ 表重命名保持一致性（KnowledgeGap → SageKnowledgeGap, MemoryDocumentVersion → SageMemoryDocument）

### P2 (UI 和体验优化 - 待实现)
17. ⏳ Knowledge Gap 列表 UI（支持 resolve/delete）
18. ⏳ Memory Document 版本历史 UI
19. ⏳ Gap 来源追踪展示
20. ⏳ Interview 关联的 gaps 展示
21. ⏳ 处理进度实时更新（WebSocket/SSE）

### P3 (增强功能)
22. Tool 调用（deep research）
23. 权限控制优化
24. 聊天记录管理后台
25. 定期自动创建 Interview（cron job）
26. 批量处理多个 Sage
27. 处理失败通知（邮件/站内信）

---

## 文件结构

```
src/app/(sage)/
├── README.md                 # 本文档
├── types.ts                  # 类型定义
├── lib.ts                    # 核心工具函数
├── processing.ts             # 后台处理逻辑
├── prompt.ts                 # AI 提示词模板
├── actions.ts                # Server Actions
├── tools.ts                  # Interview 工具定义
├── tools/
│   └── ui.tsx               # 工具 UI 渲染
├── api/
│   └── chat/
│       ├── sage/route.ts           # 专家对话 API
│       └── sage-interview/route.ts # 补充访谈 API
├── sage/
│   ├── page.tsx             # 创建专家/添加源
│   ├── SageHomePageClient.tsx
│   └── [sageToken]/
│       ├── page.tsx         # 详情页
│       ├── SageDetailView.tsx
│       ├── ProcessingStatusSection.tsx
│       └── KnowledgeAnalysisSection.tsx
├── sages/
│   ├── page.tsx             # 专家列表
│   └── SagesListClient.tsx
└── (chat)/
    └── sage/
        ├── chat/[userChatToken]/    # 对话
        └── interview/[userChatToken]/ # 访谈
```

---

## AI 模型使用策略

### 主流程（3 次 AI 调用）
- **Step 2.1 - 内容处理**: gemini-2.5-flash
  - 用途：processInitialContent
  - 提取关键知识点、建议分类、清洗内容
  - 成本低、速度快

- **Step 2.2 - Memory Document 构建**: claude-sonnet-4-5
  - 用途：buildMemoryDocument
  - 生成结构化 Markdown 文档
  - 高质量输出

- **Step 3 - 知识分析**: claude-sonnet-4
  - 用途：analyzeKnowledgeCompleteness
  - 7 维度评分、识别知识空白
  - 深度分析能力

### 辅助功能
- **对话质量监控**: gemini-2.5-flash
  - 用途：analyzeConversationForGaps
  - 快速检测专家回答中的知识空白

- **专家对话**: claude-sonnet-4
  - 用途：sageChatSystem
  - 高质量专家咨询

- **补充访谈**: claude-sonnet-4
  - 用途：generateInterviewPlan
  - 生成访谈计划和问题

- **向量嵌入**: Jina AI Embeddings v3
  - 1024 维 halfvec
  - 用于语义检索
