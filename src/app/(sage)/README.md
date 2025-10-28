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
- **memoryDocument**: Markdown 格式的核心知识文档
- **embedding**: 向量嵌入（用于检索和匹配）
- **extra.processing**: 处理状态追踪
- **extra.knowledgeAnalysis**: 知识分析结果（7维度 + 知识空白）

### SageSource (知识源)
- 一个 Sage 对应多个 Source
- **type**: "text" | "file" | "url"
- **content**: 文本内容或文件信息
- **status**: "pending" | "processing" | "completed" | "failed"
- **extractedContent**: AI 解析后的结构化内容
- 处理状态独立追踪，支持增量添加

### SageChat (专家对话)
- 用户与专家的咨询对话
- 关联 UserChat 管理消息
- 对话后可能产生新的知识空白

### SageInterview (补充访谈)
- 针对知识空白的补充访谈
- **purpose**: 访谈目的
- **focusAreas**: 关注领域（来自知识空白）
- **extra.interviewPlan**: AI 生成的访谈计划
- 访谈结束后更新 Memory Document

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

#### 后台处理流程
```
For each SageSource:
  1. 解析内容 (processSourceContent)
     - file: 提取文本
     - text: 直接使用
     - url: 爬取内容

  2. AI 提取结构化知识 (extractMemoriesFromContent)
     - 识别关键知识点
     - 分类整理

All sources processed →
  3. 构建 Memory Document (buildMemoryDocument)
     - 整合所有知识
     - 生成结构化 Markdown

  4. 知识分析 (analyzeKnowledgeCompleteness)
     - 7 维度评分
     - 识别知识空白

  5. 生成向量嵌入 (generateSageEmbedding)
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

### 3. 知识空白的两个来源

#### 来源 1: 初始知识分析
- 创建 Sage 后，AI 分析 Memory Document
- 基于 7 维度评分，识别薄弱领域
- 生成初始知识空白列表

#### 来源 2: 对话中发现（核心创新）
```
用户与专家对话 →
  AI 监控回答质量 →
    发现回答不足/模糊/缺失 →
      生成新的知识空白卡片
```

**实现方式**:
- 在 `/api/chat/sage` 中，onStepFinish 时分析对话
- 调用 `analyzeConversationForGaps()`
- 检测专家回答的薄弱点
- 创建新的 KnowledgeGap 条目，追加到 extra.knowledgeAnalysis.knowledgeGaps

### 4. 补充访谈

#### 触发方式
1. 详情页点击知识空白卡片的"开始补充访谈"
2. 调用 `createSupplementaryInterview(sageId, gapId?)`
3. AI 生成访谈计划（基于选中的知识空白）

#### 访谈界面 (`/sage/interview/[userChatToken]`)
使用 **FocusedInterviewChat** 组件:
```
┌─────────────────────────────────────┐
│ 补充访谈: AI 辅助设计工具            │
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
- 结束时提取新知识，更新 Memory Document

### 5. 专家对话（用户咨询）

#### 私有对话 (`/sage/chat/[userChatToken]`)
- Owner 与自己的专家对话
- 使用 **UserChatSession** 组件

#### 公开对话 (`/sage/[sageToken]/chat` 或 `/p/[sageToken]`)
- 公开专家的 Landing Page
- 任何人都可以对话
- 对话记录 owner 可在后台查看

---

## 关键技术实现

### 1. Knowledge Gaps 存储修复
**问题**: `updateSageKnowledgeAnalysis()` 只存了 overallScore 和 dimensions

**修复**:
```typescript
const analysisData = {
  overallScore: analysis.overallScore,
  dimensions: analysis.dimensions,
  knowledgeGaps: analysis.knowledgeGaps, // ← 添加这个
  analyzedAt: new Date().toISOString(),
};
```

### 2. Source 独立处理
- 每个 SageSource 独立状态追踪
- 支持增量添加（后续可以添加更多源）
- 失败的 source 可以重试

### 3. 对话质量监控
```typescript
// In /api/chat/sage route.ts
onStepFinish: async (step) => {
  // 分析本轮对话
  const gaps = await analyzeConversationForGaps({
    userMessage: lastUserMessage,
    aiResponse: step.text,
    sage: sage,
  });

  // 如果发现新的知识空白
  if (gaps.length > 0) {
    await appendKnowledgeGaps(sageId, gaps);
  }
}
```

### 4. Memory Document 编辑
- 简单的 Markdown 编辑器（左右分栏）
- 保存时更新 Sage.memoryDocument
- 保存后重新生成 embedding

---

## 实现优先级

### P0 (必须完成)
1. ✅ 创建 SageSource schema 和 migration
2. ✅ 修复 Knowledge Gaps 存储
3. ✅ 实现 source 处理管道（file + text）
4. ✅ 创建知识源添加页面 UI
5. ✅ 更新详情页展示 sources 状态

### P1 (核心体验)
6. ✅ Memory Document 编辑功能
7. ✅ 集成 interview 工具到 API
8. ✅ 对话分析识别知识空白
9. ✅ 公开专家页面

### P2 (增强功能)
10. URL 知识源支持
11. Tool 调用（deep research）
12. 权限控制优化
13. 聊天记录管理后台

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

- **快速处理**: gemini-2.5-flash (source 解析)
- **深度分析**: claude-sonnet-4 (知识分析、空白识别)
- **综合构建**: claude-sonnet-4-5 (Memory Document 生成)
- **对话**: gemini-2.5-flash 或 claude-3-7-sonnet
- **嵌入**: Jina AI v3 (1024 维)
