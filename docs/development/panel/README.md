# 面板讨论功能实现文档

> **✅ 文档类型：实现文档 / Implementation Documentation**
>
> 本文档描述面板讨论功能的实际代码实现、架构设计和使用方式。
>
> This document describes the actual code implementation, architecture design, and usage of the panel discussion feature.
>
> **其他参考文档 / Other Reference Docs**:
> - [设计参考 / Design Reference](./design-mvp-plan.md) - MVP 设计思路和最佳实践建议
> - [Panel 类型参考 / Panel Types Reference](./reference-panel-types.md) - 各种 Panel 形式介绍
> - [访谈类型参考 / Interview Types Reference](./reference-interview-types.md) - 各种访谈形式介绍

---

## 概述

面板讨论（Panel Discussion）功能允许用户组织多个 AI 角色（persona）进行集体讨论，通过角色间的互动来产生洞察、达成共识或探索不同观点。该功能已完整实现，包括动态讨论类型生成、主持人引导、实时前端展示等核心能力。

## 核心架构

### 目录结构

```
src/app/(panel)/
├── lib/                          # 核心业务逻辑
│   ├── orchestration.ts         # 主流程编排（runPanelDiscussion）
│   ├── persistence.ts           # 数据库操作（保存时间线、配置）
│   ├── formatting.ts            # 时间线格式化（给 persona/主持人）
│   ├── speaker-selection.ts     # 发言者选择策略
│   ├── generation.ts            # LLM 生成（persona 回复、总结、纪要）
│   └── index.ts                 # 导出入口
├── discussionTypes/              # 讨论类型配置
│   ├── index.ts                 # 类型注册表（单一数据源）
│   ├── buildDiscussionType.ts    # 动态生成讨论类型
│   ├── default/                 # 默认（焦点小组）类型
│   ├── debate/                  # 辩论类型
│   └── roundTable/              # 圆桌类型
├── prompt/
│   └── minutes.ts               # 讨论纪要生成提示词
├── actions.ts                    # 服务端动作（前端数据获取）
└── types.ts                      # 类型定义

src/ai/tools/experts/discussionChat/
├── index.ts                      # 工具定义
└── types.ts                      # 输入/输出 Schema

src/app/admin/panel/              # 管理后台测试界面
├── page.tsx                      # 测试页面
├── actions.ts                    # 服务端动作
└── [id]/                         # 讨论展示页面
```

### 数据库模型

```prisma
model PersonaPanel {
  id        Int      @id @default(autoincrement())
  userId    Int
  personaIds Json    @default("[]")  // Persona ID 列表
  extra     Json     @default("{}")  // 扩展配置（如 moderatorSystem）
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  discussionTimelines DiscussionTimeline[]
}

model DiscussionTimeline {
  id        Int      @id @default(autoincrement())
  token     String   @unique @db.VarChar(64)  // 用于安全访问
  instruction String  @db.Text                 // 用户指令
  personaPanelId Int?                          // 关联 PersonaPanel
  events    Json                               // TimelineEvent[] 数组
  summary   String   @db.Text                  // 主持人总结
  minutes   String   @db.Text                  // 结构化讨论纪要
  extra     Json     @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 核心逻辑流程

### 1. 工具调用入口

**位置**：`src/ai/tools/experts/discussionChat/index.ts`

工具接收用户指令（`instruction`）和 persona ID 列表，自动生成 `timelineToken`（通过 Zod schema transform），创建 `DiscussionTimeline` 记录后调用核心函数。

### 2. 主流程编排

**位置**：`src/app/(panel)/lib/orchestration.ts` → `runPanelDiscussion`

**流程**：
1. **动态生成讨论类型**：调用 `buildDiscussionType` 根据用户指令生成自定义的 `moderatorSystem` 提示词
2. **保存配置**：将生成的配置保存到 `PersonaPanel` 表，并关联到 `DiscussionTimeline`
3. **初始化讨论**：加载 persona 数据，创建初始时间线（包含用户问题）
4. **讨论循环**（最多 12 轮）：
   - 主持人选择下一个发言者（`selectNextSpeakerModerator`）
   - 主持人生成跟进问题（引导讨论方向）
   - Persona 生成回复（`generatePersonaReply`）
   - 实时保存到数据库（`saveTimelineEvent`）
5. **生成总结和纪要**：并行生成主持人总结和结构化讨论纪要（`generateSummaryAndMinutes`）
6. **最终保存**：保存完整时间线、总结和纪要到数据库

### 3. 关键模块说明

#### 讨论类型系统（`discussionTypes/`）

- **单一数据源**：`index.ts` 维护所有讨论类型的注册表
- **动态生成**：`buildDiscussionType.ts` 使用 LLM（claude-sonnet-4-5）根据用户指令生成自定义 `moderatorSystem`
- **固定配置**：`panelSummarySystem` 和 `panelRules` 始终使用默认焦点小组配置
- **预设类型**：支持 default（焦点小组）、debate（辩论）、roundtable（圆桌）三种预设类型

#### 发言者选择（`speaker-selection.ts`）

- **主持人选择模式**：使用 LLM 分析讨论内容，选择下一个发言者并生成跟进问题
- **智能引导**：主持人可以控制讨论节奏、改变讨论方向、选择发言者

#### 时间线格式化（`formatting.ts`）

- **Persona 视角**：只看到主持人生成的问题，看不到初始用户问题
- **主持人视角**：看到完整时间线，包括所有问题和回复

#### 生成模块（`generation.ts`）

- **Persona 回复**：基于格式化时间线和主持人问题生成回复
- **总结生成**：基于完整时间线生成讨论总结
- **纪要生成**：生成结构化的、无损的讨论记录（保留时间顺序）

#### 持久化（`persistence.ts`）

- **实时保存**：每次时间线更新都立即保存到数据库
- **配置保存**：保存 `PersonaPanel` 配置供后续复用

## 数据结构

### TimelineEvent 类型

```typescript
type TimelineEvent =
  | { type: "question"; content: string; author: "user" | "moderator" }
  | { type: "persona-reply"; personaId: number; personaName: string; content: string }
  | { type: "moderator"; content: string }
  | { type: "moderator-selection"; selectedPersonaId: number; selectedPersonaName: string; reasoning?: string }
```

### PersonaSession（运行时状态）

```typescript
interface PersonaSession {
  personaId: number;
  personaName: string;
  systemPrompt: string; // personaAgentSystem(persona)
}
```

## 前端展示

### 管理后台测试界面

**位置**：`src/app/admin/panel/`

- 输入指令和选择 persona
- 实时展示讨论过程（通过轮询数据库）
- 显示问题、回复、主持人总结等所有时间线事件

### 工具结果展示

**位置**：`src/app/(study)/study/console/DiscussionChatConsole.tsx`

- 从工具输入中获取 `timelineToken`（自动生成，立即可用）
- 轮询数据库获取最新时间线
- 实时渲染讨论内容

## 核心特性

### ✅ 已实现

1. **动态讨论类型**：根据用户指令自动生成讨论风格（辩论、圆桌、焦点小组等）
2. **主持人智能引导**：主持人可以控制讨论节奏、改变方向、选择发言者
3. **实时更新**：时间线事件实时保存，前端可立即获取
4. **结构化输出**：同时生成总结（面向目标）和纪要（无损记录）
5. **配置复用**：`PersonaPanel` 配置可保存和复用
6. **安全访问**：使用 token 而非 ID 进行数据访问

### 技术亮点

1. **模块化设计**：核心逻辑拆分为独立模块（orchestration、generation、formatting 等）
2. **单一数据源**：讨论类型配置集中在 `discussionTypes/index.ts`
3. **实时持久化**：每次更新立即保存，无需等待讨论完成
4. **类型安全**：完整的 TypeScript 类型定义

## 使用方式

### 通过工具调用

```typescript
// 工具输入
{
  instruction: "讨论：远程工作是否应该成为强制要求？请以辩论形式进行。",
  personaIds: [1, 2, 3],
  timelineToken: string // 自动生成
}

// 工具输出
{
  summary: string,              // 主持人总结
  discussionTimelineId: string, // token
  plainText: string             // LLM 可读文本
}
```

### 通过管理后台

访问 `/admin/panel`，输入指令和选择 persona，系统自动创建讨论并展示。

## 数据库迁移

已创建以下迁移：
- `PersonaPanel` 表：存储可复用的面板配置
- `DiscussionTimeline` 表：存储讨论时间线、总结和纪要
- `token` 字段：用于安全访问（替代 ID）

## 后续扩展方向

- 多轮对话（用户追问）
- 流式响应
- 并发发言
- 用户插话
- 讨论热度指标

## 注意事项

1. **Token 生成**：`timelineToken` 在工具输入 schema 中自动生成，前端可立即获取
2. **实时保存**：时间线事件每次更新都保存，确保前端轮询能获取最新数据
3. **讨论类型**：只有 `moderatorSystem` 是动态生成的，`panelSummarySystem` 和 `panelRules` 使用默认配置
4. **最大轮数**：当前设置为 12 轮，可在 `orchestration.ts` 中调整
