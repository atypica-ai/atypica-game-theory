# 多 Agent 系统架构

本文档详细介绍 atypica.AI 的多智能体协作系统设计。

## 核心理念

atypica.AI 通过多个专业化的 AI Agent 协作完成复杂的商业研究任务。每个 Agent 都有明确的职责和专业领域，通过工具调用和消息传递进行协作。

### 设计原则

1. **专业化分工**: 每个 Agent 专注于特定领域
2. **工具驱动**: 通过工具扩展 Agent 能力
3. **流式交互**: 实时反馈执行进度
4. **上下文共享**: Agent 间共享研究上下文

## Agent 类型

### 1. Study Agent - 研究助手

**职责**: 全流程协调者，引导用户明确研究需求

**位置**: `src/app/(study)/`

**核心功能**:
- 理解用户研究意图
- 制定研究计划
- 协调其他 Agent
- 整合研究结果
- 生成最终报告

**可用工具**:
```typescript
{
  reasoningThinking,    // 深度思维分析
  scoutTaskChat,        // 用户发现
  interview,            // 访谈管理
  generateReport,       // 报告生成
  createSubAgent,       // MCP 工具调用
}
```

**典型流程**:
```
用户输入研究需求
    ↓
Study Agent 分析需求
    ↓
规划研究步骤
    ↓
调用专业工具
    ↓
整合研究成果
    ↓
生成研究报告
```

### 2. Scout Agent - 用户发现

**职责**: 通过社交媒体观察理解目标用户群体

**位置**: `src/app/(newStudy)/`

**核心功能**:
- 社交媒体内容搜索和分析
- 用户画像构建
- 社会心理学分析
- 定性观察和洞察

**工作模式** (3 阶段):
1. **观察阶段**: 收集 5+ 条社交媒体内容
2. **推理阶段**: 使用 `reasoningThinking` 工具进行社会心理学分析
3. **验证阶段**: 确认人设特征和行为模式

**可用工具**:
```typescript
{
  reasoningThinking,    // 深度分析（必须在观察后使用）
  xhsSearch,           // 小红书搜索
  douyinSearch,        // 抖音搜索
  twitterSearch,       // Twitter 搜索
  instagramSearch,     // Instagram 搜索
  tiktokSearch,        // TikTok 搜索
}
```

**关键特性**:
- 强制使用 `reasoningThinking` 进行深度分析
- 社会心理学视角的用户理解
- 构建详细的人设档案

### 3. Interviewer Agent - 访谈主持

**职责**: 执行专业访谈，提取关键信息

**位置**: `src/app/(interviewProject)/`

**核心功能**:
- 设计访谈问题
- 引导访谈对话
- 收集用户反馈
- 分析访谈结果

**可用工具**:
```typescript
{
  selectQuestion,      // 选择访谈问题
  endInterview,        // 结束访谈
}
```

**访谈流程**:
```
创建访谈项目
    ↓
生成受访人设
    ↓
Interviewer 引导对话
    ↓
Persona 回答问题
    ↓
记录访谈数据
    ↓
分析访谈结果
```

### 4. Persona Agent - AI 人设

**职责**: 模拟真实用户，提供真实反馈

**位置**: `src/app/(persona)/`

**核心功能**:
- 人设对话模拟
- 行为和决策模拟
- 情感和态度表达
- 背景信息维护

**人设层级**:
- **Tier 1**: 高质量专业人设
- **Tier 2**: 标准人设
- **Tier 3**: 基础人设

**特性**:
- 向量化存储（pgvector）
- 相似度搜索
- 个性化回答
- 上下文记忆

### 5. Sage Agent - 专家智能体

**职责**: 专业领域的深度分析和洞察

**位置**: `src/app/(sage)/`

**核心功能**:
- 专业知识分析
- 深度研究报告
- 趋势预测
- 策略建议

**特点**:
- 基于大量知识库
- 长文本深度分析
- 多维度思考
- 可生成播客内容

### 6. Misc Agents - 杂项 Agent

**位置**: `src/app/(agents)/`

**包含**:
- 问答 Agent
- 客服 Agent
- 其他辅助 Agent

## AI 工具系统

### 工具分类

```
src/ai/tools/
├── experts/          # 专家工具
├── social/           # 社交媒体工具
├── mcp/              # MCP 协议工具
└── system/           # 系统工具
```

### 核心工具

#### reasoningThinking - 深度思维

**用途**: 复杂问题的深度分析和推理

**特点**:
- 结构化思维过程
- 多步骤推理
- 批判性思考
- 结论验证

**典型场景**:
- Scout 的社会心理学分析
- 复杂研究问题的拆解
- 多角度论证

#### scoutTaskChat - 用户发现

**用途**: 社交媒体观察和人设构建

**流程**:
1. 搜索目标群体内容
2. 收集至少 5 条观察
3. 触发 reasoningThinking 分析
4. 构建人设档案

#### interview - 访谈管理

**用途**: 管理访谈流程

**功能**:
- 创建访谈会话
- 选择受访人设
- 记录访谈对话
- 分析访谈数据

#### generateReport - 报告生成

**用途**: 生成结构化研究报告

**支持格式**:
- Markdown
- HTML
- PDF (通过 HTML 转换)

#### createSubAgent - MCP 工具调用

**用途**: 调用 MCP 协议的外部工具

**特点**:
- 动态工具发现
- 自动工具选择
- 流式结果返回
- 团队级别配置

## Agent 协作模式

### 1. 层级协作

```
Study Agent (协调者)
    ↓
Scout Agent → 发现用户群体
    ↓
Interview Agent → 深度访谈
    ↓
Persona Agent → 用户反馈
    ↓
Study Agent → 整合报告
```

### 2. 并行协作

```
Study Agent
    ├→ Scout Agent (用户发现)
    ├→ Sage Agent (专家分析)
    └→ MCP Tools (外部数据)
         ↓
    整合多源信息
```

### 3. 迭代协作

```
初始研究 → 发现 Gap → 深入研究 → 再次验证 → 最终结论
```

## 消息和上下文

### 消息结构

```typescript
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  parts: MessagePart[];
  createdAt: Date;
}

type MessagePart =
  | TextPart
  | ToolCallPart
  | ToolResultPart;
```

### 上下文管理

**工作记忆** (Working Memory):
- 当前对话历史
- 临时分析结果
- 工具调用状态

**长期记忆** (Long-term Memory):
- 人设数据库
- 历史研究记录
- 知识库

**核心记忆** (Core Memory):
- 研究目标和计划
- 关键发现和洞察
- 待解决问题 (Gaps)

## 流式处理

### SSE (Server-Sent Events)

所有 Agent 响应都支持流式传输：

```typescript
const result = streamText({
  model: llm("gpt-4o"),
  messages,
  tools,
  experimental_transform: smoothStream({
    delayInMs: 30,
    chunking: /[\u4E00-\u9FFF]|\S+\s+/,  // 中文优化
  }),
});
```

### 流式优化

- **平滑渲染**: smoothStream 中文字符优化
- **实时 UI**: 逐字显示响应
- **进度通知**: MCP Progress Notification
- **工具状态**: 实时工具调用状态

## Token 管理

### 消耗追踪

```typescript
onStepFinish: async (step) => {
  const { tokens, extra } = calculateStepTokensUsage(step);
  await statReport("tokens", tokens, {
    reportedBy: "chat",
    modelName: step.model,
    userId: session.userId,
  });
};
```

### 配额管理

- 用户级别配额
- 团队级别配额
- 订阅计划限制
- 月度重置机制

## 错误处理

### 重试机制

```typescript
const result = streamText({
  model: llm("gpt-4o"),
  maxRetries: 3,
  onError: ({ error }) => {
    logger.error({
      msg: "AI stream error",
      error: error.message,
      userId,
      modelName,
    });
  },
});
```

### Fallback 策略

- 主模型失败 → 备用模型
- 工具调用失败 → 降级方案
- 超时 → 部分结果返回

## 性能优化

### Prompt 缓存

- 系统提示词缓存
- 人设描述缓存
- 工具描述缓存

### 并行处理

```typescript
const [userData, socialData, expertData] = await Promise.all([
  scoutAgent.discover(),
  socialSearch.query(),
  sageAgent.analyze(),
]);
```

### 懒加载

- 按需加载工具
- 延迟人设查询
- 分页加载历史

## 扩展新 Agent

### 开发步骤

1. **创建 Agent 目录**
```
src/app/(myAgent)/
├── chat/
│   └── [token]/
│       └── page.tsx
├── api/
│   └── route.ts
├── prompt.ts
└── types.ts
```

2. **定义 Prompt**
```typescript
export const myAgentPrompt = `
你是一个专业的 XXX Agent...
`;
```

3. **注册工具**
```typescript
const tools = {
  myTool: tool({
    description: "Tool description",
    parameters: z.object({ ... }),
    execute: async (args) => { ... },
  }),
};
```

4. **实现 API 路由**
```typescript
export async function POST(req: Request) {
  const result = streamText({
    model: llm("gpt-4o"),
    system: myAgentPrompt,
    messages,
    tools,
  });
  return result.toUIMessageStreamResponse();
}
```

## 测试策略

### 单元测试

- 工具函数测试
- Prompt 解析测试
- 消息转换测试

### 集成测试

- Agent 协作流程
- 工具调用链路
- 错误恢复机制

### E2E 测试

- 完整研究流程
- 用户交互场景
- 性能基准测试

## 相关文档

- [系统架构概览](./overview.md)
- [AI 工具开发指南](../development/ai-tools/)
- [Prompt 最佳实践](../../src/ai/prompt/)
- [MCP 集成](../mcp/README.md)

---

最后更新：2025-12
