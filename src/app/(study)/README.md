# (study) Agent System

> 业务研究 AI Agent 框架 - 统一执行架构与多 Agent 协作系统

## 概述

`(study)` 模块实现了 atypica.AI 的核心研究 Agent 系统，采用**统一执行架构**支持多种研究类型和持久化记忆。

相关文档：
- **架构理念**：[GEA Architecture](../../docs/architecture/gea-architecture.md) - 了解推理-执行分离、Intent-Reasoning-Execute 三层架构
- **系统架构**：[Architecture Overview](../../docs/architecture/overview.md) - 整体技术栈和设计原则
- **术语表**：[Glossary](../../docs/glossary.md) - 统一的术语定义（Study Expert、AI Persona、Interview 等）

### 核心特点

- **统一执行器**：所有 Agent 通过 `baseAgentRequest` 统一执行，消除代码重复（删除 1,211 行重复代码）
- **推理-执行分离**：Plan Mode（意图层）决策"做什么"，Execution Agents（执行层）规划"怎么做"
- **消息驱动**：所有研究内容通过消息流转，统一灵活
- **类型安全**：严格的 TypeScript 类型系统，零 `any` 类型
- **功能统一**：所有 Agent 支持参考研究、文件附件、MCP 集成、团队提示词、Memory 系统

## 架构

### 目录结构

```
src/app/(study)/
├── agents/                       # Agent 系统核心
│   ├── baseAgentRequest.ts      # 统一执行器（删除 1,211 行重复代码）
│   └── configs/                 # Agent 配置
│       ├── planModeAgentConfig.ts
│       ├── studyAgentConfig.ts
│       ├── fastInsightAgentConfig.ts
│       └── productRnDAgentConfig.ts
├── tools/                        # 研究工具集
│   ├── index.ts                 # 工具类型定义（StudyToolSet）
│   ├── makeStudyPlan/           # Plan Mode 专用工具
│   ├── requestInteraction/      # 用户交互工具
│   ├── saveAnalyst/             # 研究意图保存
│   ├── planStudy/               # 研究战术规划
│   └── ...                      # 其他研究工具
├── prompt/                       # System Prompts
│   ├── planMode.ts              # Plan Mode 提示词
│   ├── study.ts                 # Study Agent 提示词
│   └── ...
└── api/chat/study/route.ts      # HTTP 入口和路由逻辑
```

### Agent 类型

系统包含 4 个核心 Agent，按两层架构组织：

#### 第一层：意图层（Intent Layer）

**1. Plan Mode Agent** (`analyst.kind = null`)

- **职责**：意图澄清和研究规划
- **触发时机**：用户首次创建研究时（`analyst.kind` 未设置）
- **工作流程**：
  1. 对话式澄清需求（灵活轮数）
  2. 背景调研（webSearch/webFetch）
  3. 自动判断研究类型和方法
  4. 展示完整计划，等待用户确认
- **关键工具**：`makeStudyPlan`, `requestInteraction`, `webSearch`, `webFetch`
- **输出**：用户确认后保存 `analyst.kind`，进入执行层

#### 第二层：执行层（Execution Layer）

**2. Study Agent** (`analyst.kind = testing/insights/creation/planning/misc`)

- **职责**：深度研究执行
- **研究类型**：
  - `testing`：比较测试、A/B 测试
  - `insights`：用户洞察、需求分析
  - `creation`：创意生成、方案设计
  - `planning`：策略制定、路线规划
  - `misc`：综合研究
- **研究方式**：
  - `interview`：一对一深度访谈（5-10 人）
  - `discussion`：群体讨论（3-8 人，观点碰撞）
  - `scoutTask`：社交媒体观察（3 阶段：观察 → 推理 → 验证）
- **关键工具**：`planStudy`, `interviewChat`, `discussionChat`, `scoutTaskChat`, `generateReport`

**3. Fast Insight Agent** (`analyst.kind = fastInsight`)

- **职责**：快速洞察和播客内容生成
- **触发条件**：用户需要快速可消费的内容（播客、音频、快速分析）
- **工作流程**：自动化工作流，快速生成播客
- **关键工具**：`planPodcast`, `generatePodcast`

**4. Product R&D Agent** (`analyst.kind = productRnD`)

- **职责**：产品创新灵感发现
- **触发条件**：用户寻找产品创新机会、社交趋势洞察
- **关键工具**：社交媒体观察工具 + 创新框架

### 统一执行架构

所有 Agent 通过 `baseAgentRequest` 执行，核心流程：

```typescript
// src/app/(study)/agents/baseAgentRequest.ts

export async function executeBaseAgentRequest<TOOLS extends StudyToolSet>(
  context: BaseAgentContext,
  config: AgentRequestConfig<TOOLS>,
  streamWriter: UIMessageStreamWriter,
) {
  // 1. 加载历史消息
  const messages = await loadHistoryMessages(context);

  // 2. 构建 system prompt（支持参考研究、团队提示词、MCP 工具）
  const system = await buildSystemPrompt(context, config);

  // 3. 执行 streamText（AI SDK）
  const result = streamText({
    model: llm(config.model),
    system,
    messages,
    tools: config.tools,
    maxSteps: config.maxSteps,

    // 核心扩展点 1：动态工具控制
    experimental_prepareStepFunction: config.specialHandlers?.customPrepareStep,

    // 核心扩展点 2：步骤完成回调
    onStepFinish: async (step) => {
      await saveStepToDB(step);
      await trackTokenUsage(step);
      await config.specialHandlers?.customOnStepFinish?.(step, context);
    },
  });

  // 4. 流式输出到前端
  return streamToUI(result, streamWriter);
}
```

### Agent 路由逻辑

入口：`src/app/(study)/api/chat/study/route.ts:170-184`

```typescript
if (!userChat.analyst.kind) {
  // Plan Mode - 意图层
  const config = await createPlanModeAgentConfig(agentContext);
  await executeBaseAgentRequest(agentContext, config, streamWriter);
} else if (userChat.analyst.kind === AnalystKind.productRnD) {
  const config = await createProductRnDAgentConfig(agentContext);
  await executeBaseAgentRequest(agentContext, config, streamWriter);
} else if (userChat.analyst.kind === AnalystKind.fastInsight) {
  const config = await createFastInsightAgentConfig(agentContext);
  await executeBaseAgentRequest(agentContext, config, streamWriter);
} else {
  // Study Agent - 处理 testing/insights/creation/planning/misc
  const config = await createStudyAgentConfig(agentContext);
  await executeBaseAgentRequest(agentContext, config, streamWriter);
}
```

### 持久化系统

Agent 依赖以下持久化系统：

- **Memory 系统**：[Memory System Design](../../docs/development/memory/system-design.md) - 用户和团队级持久化记忆（core + working）
- **数据库架构**：[Schema Overview](../../docs/development/database/schema-overview.md) - UserChat、Analyst、Memory、Persona 等核心模型

关键数据流：
```
UserChat (对话会话)
  ├─ Analyst (研究元数据：kind, topic, role, locale)
  ├─ ChatMessage (消息历史：user/assistant/tool)
  └─ Memory (持久化记忆：core markdown + working json)
```

## 开发指南

### 创建新 Agent

假设你要创建一个新的 "Competitive Analysis Agent"（竞品分析 Agent）：

#### Step 1: 定义 Agent Config

创建 `src/app/(study)/agents/configs/competitiveAgentConfig.ts`：

```typescript
import "server-only";
import { AgentRequestConfig } from "../baseAgentRequest";
import { StudyToolSet } from "@/app/(study)/tools";

// 1. 定义工具集类型（精确推导）
type TOOLS = ReturnType<typeof buildCompetitiveTools>;

export interface CompetitiveAgentConfigParams {
  userId: number;
  studyUserChatId: number;
  locale: Locale;
  logger: Logger;
  statReport: StatReporter;
  toolAbortController: AbortController;
}

// 2. 创建 config 函数
export async function createCompetitiveAgentConfig(
  params: CompetitiveAgentConfigParams,
): Promise<AgentRequestConfig<TOOLS>> {
  const tools = buildCompetitiveTools(params);

  return {
    model: "claude-sonnet-4",
    systemPrompt: competitiveSystem({ locale: params.locale }),
    tools,
    maxSteps: 20,

    specialHandlers: {
      // 3. 可选：动态工具控制
      customPrepareStep: async ({ messages }) => {
        // 根据消息历史动态调整可用工具
        let activeTools: (keyof TOOLS)[] | undefined = undefined;

        // 示例：报告生成后限制工具
        if (hasGeneratedReport(messages)) {
          activeTools = [ToolName.generateReport, ToolName.reasoningThinking];
        }

        return { messages, activeTools };
      },

      // 4. 可选：步骤完成后的自定义逻辑
      customOnStepFinish: async (step, context) => {
        // 示例：特定工具调用后的处理
        const reportTool = step.toolResults.find(
          (tool) =>
            !tool.dynamic &&
            tool.type === "tool-result" &&
            tool.toolName === ToolName.generateReport,
        ) as StaticToolResult<Pick<TOOLS, ToolName.generateReport>> | undefined;

        if (reportTool && "output" in reportTool && reportTool.output) {
          await notifyReportCompletion({
            reportToken: reportTool.output.reportToken,
            studyUserChatId: context.studyUserChatId,
            logger: context.logger,
          });
        }
      },
    },
  };
}

// 5. 构建工具集
function buildCompetitiveTools(params: BuildParams) {
  const { locale, logger, statReport, toolAbortController } = params;

  const agentToolArgs = {
    locale,
    abortSignal: toolAbortController.signal,
    statReport,
    logger,
  };

  return {
    [ToolName.webSearch]: webSearchTool(agentToolArgs),
    [ToolName.webFetch]: webFetchTool(agentToolArgs),
    [ToolName.competitiveAnalysis]: competitiveAnalysisTool(agentToolArgs),
    [ToolName.generateReport]: generateReportTool(agentToolArgs),
    [ToolName.reasoningThinking]: reasoningThinkingTool(agentToolArgs),
    [ToolName.toolCallError]: toolCallError,
  };
}
```

#### Step 2: 创建 System Prompt

创建 `src/app/(study)/prompt/competitive.ts`：

```typescript
import "server-only";
import { promptSystemConfig } from "@/ai/prompt/systemConfig";
import { Locale } from "next-intl";

export const competitiveSystem = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `${promptSystemConfig({ locale })}
<COMPETITIVE_ANALYSIS_AGENT>
你是竞品分析专家...

<工作流程>
1. 识别竞品
2. 收集数据
3. 对比分析
4. 生成报告
</工作流程>

<可用工具>
- webSearch: 搜索竞品信息
- competitiveAnalysis: 执行竞品对比分析
- generateReport: 生成分析报告
</可用工具>
</COMPETITIVE_ANALYSIS_AGENT>
`
    : `${promptSystemConfig({ locale })}
<COMPETITIVE_ANALYSIS_AGENT>
You are a competitive analysis expert...
</COMPETITIVE_ANALYSIS_AGENT>
`;
```

#### Step 3: 添加路由

在 `src/app/(study)/api/chat/study/route.ts` 添加路由：

```typescript
import { createCompetitiveAgentConfig } from "@/app/(study)/agents/configs/competitiveAgentConfig";

// 在 executeAgent 函数中添加：
if (userChat.analyst.kind === AnalystKind.competitive) {
  const config = await createCompetitiveAgentConfig(agentContext);
  await executeBaseAgentRequest(agentContext, config, streamWriter);
}
```

#### Step 4: 更新数据库 Schema

在 `prisma/schema.prisma` 的 `AnalystKind` 枚举中添加：

```prisma
enum AnalystKind {
  productRnD
  fastInsight
  testing
  insights
  creation
  planning
  misc
  competitive  // 新增
}
```

### 添加新工具

#### Step 1: 定义工具

创建 `src/app/(study)/tools/competitiveAnalysis/index.ts`：

```typescript
import "server-only";
import { tool } from "ai";
import { z } from "zod";

export const competitiveAnalysisTool = ({ locale, logger, statReport }: AgentToolConfigArgs) =>
  tool({
    description: "执行竞品对比分析，生成对比矩阵",

    parameters: z.object({
      competitors: z.array(z.string()).describe("竞品列表"),
      dimensions: z.array(z.string()).describe("对比维度"),
    }),

    execute: async ({ competitors, dimensions }) => {
      logger.info({
        msg: "执行竞品分析",
        competitors,
        dimensions,
      });

      // 实现分析逻辑
      const analysis = await performCompetitiveAnalysis(competitors, dimensions);

      // 追踪 token 使用
      await statReport("tokens", { input: 100, output: 200 });

      return {
        analysis,
        plainText: "竞品分析完成",
      };
    },
  });
```

#### Step 2: 添加到工具类型

在 `src/app/(study)/tools/index.ts` 的 `StudyToolSet` 中添加：

```typescript
export type StudyToolSet = Partial<{
  // ... 现有工具
  [ToolName.competitiveAnalysis]: ReturnType<typeof competitiveAnalysisTool>;
}>;
```

#### Step 3: 添加工具名称

在 `src/app/(study)/tools/types.ts` 的 `StudyToolName` 枚举中添加：

```typescript
export enum StudyToolName {
  // ... 现有工具
  competitiveAnalysis = "competitiveAnalysis",
}
```

## 类型安全最佳实践

### 核心规则（来自 CLAUDE.md）

1. **禁止 `any` 类型**：没有任何 `any` 是合理的
2. **禁止动态导入**：不允许 `await import()`
3. **禁止 ESLint Disable**：不用 `eslint-disable` 绕过类型错误
4. **研究现有模式**：遇到类型问题先搜索已有实现

### 工具类型安全模式

#### 定义工具集类型

```typescript
// src/app/(study)/tools/index.ts
import "server-only";
import { ToolSet } from "ai";
import { ToolName } from "@/ai/tools/types";

export type StudyToolSet = Partial<{
  [ToolName.webSearch]: ReturnType<typeof webSearchTool>;
  [ToolName.generateReport]: ReturnType<typeof generateReportTool>;
  // ... 所有可能的工具
}>;

// 验证类型正确性
type StudyToolSetCheck = StudyToolSet extends ToolSet ? true : false;
```

#### Agent Config 泛型约束

```typescript
export interface AgentRequestConfig<TOOLS extends StudyToolSet = StudyToolSet> {
  model: LLMModelName;
  systemPrompt: string;
  tools: TOOLS;
  maxSteps?: number;
  toolChoice?: ToolChoice<TOOLS>;

  specialHandlers?: {
    // 使用 AI SDK 内置类型
    customPrepareStep?: PrepareStepFunction<NoInfer<TOOLS>>;
    customOnStepFinish?: (step: StepResult<TOOLS>, context: BaseStepContext) => Promise<void>;
  };
}
```

**关键点**：
- `TOOLS extends StudyToolSet` 确保工具是基础工具集的子集
- `NoInfer<TOOLS>` 防止 TypeScript 类型扩展
- 使用 AI SDK 的 `PrepareStepFunction` 而非自定义接口

#### Per-Agent 工具类型定义

```typescript
// 从构建函数推导精确类型
type TOOLS = ReturnType<typeof buildStudyTools>;

export async function createStudyAgentConfig(
  params: StudyAgentConfigParams,
): Promise<AgentRequestConfig<TOOLS>> {
  const tools = buildStudyTools(params);

  return {
    model: "claude-sonnet-4",
    systemPrompt,
    tools,

    specialHandlers: {
      customPrepareStep: async ({ messages }) => {
        // ✅ activeTools 类型完全安全
        let activeTools: (keyof TOOLS)[] | undefined = undefined;

        if (someCondition) {
          // TypeScript 会检查这些工具名是否存在
          activeTools = [ToolName.generateReport, ToolName.saveAnalyst];
        }

        return { messages, activeTools };
      },
    },
  };
}
```

#### 类型安全的工具结果处理

```typescript
// ❌ 错误：使用 any
const tool = step.toolResults.find((t) => t?.toolName === ToolName.generateReport) as any;
const token = tool.output.reportToken; // 无类型安全！

// ✅ 正确：使用 StaticToolResult
import { StaticToolResult } from "ai";

const generateReportTool = step.toolResults.find(
  (tool) =>
    !tool.dynamic &&
    tool.type === "tool-result" &&
    tool.toolName === ToolName.generateReport,
) as StaticToolResult<Pick<StudyToolSet, ToolName.generateReport>> | undefined;

// 类型守卫
if (generateReportTool && "output" in generateReportTool && generateReportTool.output) {
  // ✅ 完全类型安全 - TypeScript 知道 output 的确切类型
  const reportToken = generateReportTool.output.reportToken;
  await notifyReportCompletion({ reportToken, studyUserChatId, logger });
}
```

**关键点**：
- 检查 `!tool.dynamic && tool.type === "tool-result"` 确保是静态结果
- 使用 `StaticToolResult<Pick<ToolSet, ToolName.X>>` 获取精确类型
- 使用类型守卫 `"output" in tool` 安全访问

## 常见模式

### 模式 1：工具调用计数和限制

```typescript
customPrepareStep: async ({ messages }) => {
  // 计算工具使用次数
  const toolUseCount = calculateToolUsage(messages);
  let activeTools: (keyof TOOLS)[] | undefined = undefined;

  // 报告生成后限制工具
  if ((toolUseCount[ToolName.generateReport] ?? 0) > 0) {
    activeTools = [
      ToolName.generateReport,
      ToolName.reasoningThinking,
      ToolName.toolCallError,
    ];
  }

  return { messages, activeTools };
}
```

### 模式 2：特定工具调用后的处理

```typescript
customOnStepFinish: async (step, context) => {
  // 类型安全地查找工具结果
  const saveAnalystTool = step.toolResults.find(
    (tool) =>
      !tool.dynamic &&
      tool.type === "tool-result" &&
      tool.toolName === ToolName.saveAnalyst,
  ) as StaticToolResult<Pick<TOOLS, ToolName.saveAnalyst>> | undefined;

  if (saveAnalystTool) {
    // 触发标题生成
    await generateChatTitle(context.studyUserChatId);
  }
}
```

### 模式 3：条件性工具初始化

```typescript
function buildStudyTools(params: BuildParams) {
  const tools: Partial<StudyToolSet> = {
    [ToolName.webSearch]: webSearchTool(agentToolArgs),
    [ToolName.reasoningThinking]: reasoningThinkingTool(agentToolArgs),
  };

  // 根据 kind 添加特定工具
  if (params.kind === "testing") {
    tools[ToolName.discussionChat] = discussionChatTool(agentToolArgs);
  } else if (params.kind === "insights") {
    tools[ToolName.interviewChat] = interviewChatTool(agentToolArgs);
  }

  return tools;
}
```

### 模式 4：前端交互工具

对于需要用户确认的工具（如 `makeStudyPlan`, `requestInteraction`）：

```typescript
// 1. 工具定义：不实现 execute
export const makeStudyPlanTool = tool({
  description: "展示研究计划并请求用户确认",
  inputSchema,
  outputSchema,
  toModelOutput: (result: PlainTextToolResult) => {
    return { type: "text", value: result.plainText };
  },
  // 不实现 execute - 前端通过 addToolResult 回复
});

// 2. 前端组件：拦截工具调用，展示 UI
export const MakeStudyPlanMessage = ({ toolInvocation, addToolResult }) => {
  const handleConfirm = async () => {
    // 执行服务器 action
    await saveAnalystFromPlan({ locale, kind, role, topic });

    // 回复工具结果
    addToolResult({
      tool: StudyToolName.makeStudyPlan,
      toolCallId: toolInvocation.toolCallId,
      output: { confirmed: true, plainText: "用户已确认计划" },
    });
  };

  return <PlanConfirmationUI onConfirm={handleConfirm} />;
};
```

## 调试和测试

### 日志最佳实践

```typescript
// ✅ 正确：使用结构化日志
logger.info({
  msg: "执行竞品分析",
  competitors,
  dimensions,
  userId: context.userId,
});

// ❌ 错误：多参数日志
logger.info("执行竞品分析", { competitors }); // Pino 不支持！
```

### Token 追踪

```typescript
onStepFinish: async (step) => {
  const { tokens, extra } = calculateStepTokensUsage(step);

  await statReport("tokens", tokens, {
    reportedBy: "chat",
    modelName: step.model,
    userId: session.userId,
    ...extra,
  });
}
```

### 测试工具

创建测试文件 `src/app/(study)/tools/competitiveAnalysis/index.test.ts`：

```typescript
import { describe, it, expect, vi } from "vitest";
import { competitiveAnalysisTool } from "./index";

describe("competitiveAnalysisTool", () => {
  it("should analyze competitors", async () => {
    const tool = competitiveAnalysisTool({
      locale: "zh-CN",
      logger: mockLogger,
      statReport: vi.fn(),
      abortSignal: new AbortController().signal,
    });

    const result = await tool.execute({
      competitors: ["Product A", "Product B"],
      dimensions: ["价格", "功能"],
    });

    expect(result.analysis).toBeDefined();
  });
});
```

## 常见问题

### Q: 如何决定创建新 Agent 还是扩展现有 Agent？

**创建新 Agent** 的情况：
- 完全不同的研究方法论
- 需要独特的工具组合
- 工作流程与现有 Agent 差异很大

**扩展现有 Agent** 的情况：
- 只是新增一种研究类型（如新的 `kind`）
- 工具和流程相似
- 可以通过 prompt 区分

### Q: Agent 之间如何共享数据？

通过数据库：
- **UserChat**: 存储对话历史
- **Analyst**: 存储研究元数据
- **Memory**: 存储持久化记忆

```typescript
// 在 Agent 中访问共享数据
const analyst = context.analyst; // 研究元数据
const memory = await loadMemory(context.userId); // 用户记忆
```

### Q: 如何处理长时间运行的任务？

使用工具中的 `abortSignal`：

```typescript
export const longRunningTool = ({ abortSignal, logger }: AgentToolConfigArgs) =>
  tool({
    execute: async ({ input }) => {
      for (const item of items) {
        // 检查是否取消
        if (abortSignal.aborted) {
          logger.info("任务被用户取消");
          throw new Error("Task aborted");
        }

        await processItem(item);
      }
    },
  });
```

### Q: 如何在 Agent 间切换？

通过更新 `analyst.kind`：

```typescript
// Plan Mode Agent 确认后
await prisma.analyst.update({
  where: { id: analyst.id },
  data: { kind: "productRnD" }, // 下次进入 Product R&D Agent
});
```

下次对话时路由逻辑会自动选择对应的 Agent。

## 参考资料

### 项目文档

- **架构设计**
  - [GEA Architecture](../../docs/architecture/gea-architecture.md) - GEA 架构理念和 Intent-Reasoning-Execute 模式
  - [Architecture Overview](../../docs/architecture/overview.md) - 系统整体架构和技术栈
  - [Towards General Agent](../../docs/architecture/towards-general-agent.md) - 通用 Agent 架构演进
- **开发规范**
  - [CLAUDE.md](/CLAUDE.md) - Claude Code 配置和代码规范（必读）
  - [Glossary](../../docs/glossary.md) - 统一术语定义
- **数据系统**
  - [Memory System Design](../../docs/development/memory/system-design.md) - 持久化记忆系统
  - [Schema Overview](../../docs/development/database/schema-overview.md) - 数据库架构

### 代码参考

- **统一执行器**：`src/app/(study)/agents/baseAgentRequest.ts`
- **Agent 配置示例**：`src/app/(study)/agents/configs/`
- **工具系统**：`src/app/(study)/tools/`
- **System Prompts**：`src/app/(study)/prompt/`

### 外部资源

- **AI SDK 文档**：https://sdk.vercel.ai/docs
- **Vercel AI SDK GitHub**：https://github.com/vercel/ai
- **Anthropic Prompt Engineering**：https://docs.anthropic.com/claude/docs/prompt-engineering

## 贡献指南

添加新功能时：

1. ✅ 遵循类型安全规范（零 `any`）
2. ✅ 使用统一执行架构（不要绕过 `baseAgentRequest`）
3. ✅ 添加结构化日志
4. ✅ 追踪 token 使用
5. ✅ 编写测试
6. ✅ 更新本文档

---

**维护者**: atypica.AI Team
**最后更新**: 2026-01-18
