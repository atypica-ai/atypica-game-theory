# 迈向通用智能体：atypica 的第一步

**如何用消息驱动架构让 AI Agent 更通用、更灵活**

_2025-01-02_

---

## TL;DR

我们重构了 atypica 的研究系统，从固定的工具调用转向消息驱动架构。这次变更让一个 Agent 能够同时支持深度访谈、群体讨论和快速洞察三种不同的研究方式，而无需为每种方式创建专门的 Agent。

这是我们迈向 GEA（Generative Enterprise Architecture）愿景的第一步。

**关键变化**：

- 移除了 5 个专用保存工具，改为 Agent 直接输出到消息流
- 统一了 `interviewChat` 和 `discussionChat` 的输出格式
- 实现了从消息自动生成 `studyLog` 的机制
- 让一个通用 Agent 能灵活选择和组合不同的研究方法

---

## 背景：我们遇到的问题

atypica 是一个 AI 驱动的消费者研究平台。用户可以通过对话让 AI 完成完整的研究流程——从观察社交媒体、到模拟用户访谈、到生成洞察报告。

但在实践中，我们遇到了一个典型的 Multi-Agent 困境。

### 问题 1：碎片化的数据流

最初，我们的架构是这样的：

```typescript
// 旧架构：每个工具负责保存自己的数据
┌─────────────────────┐
│ Study Agent         │
└──────┬──────────────┘
       │
       ├─→ interviewChat ──→ saveInterviewConclusion ──→ DB.interviews
       │
       ├─→ scoutTaskChat ──→ saveObservations ──→ DB.observations
       │
       ├─→ webSearch ──→ (search results in messages)
       │
       └─→ saveAnalystStudySummary ──→ DB.analyst.studySummary
                                          │
                                          ↓
                              generateReport 从多处读取数据
```

**问题**：

- 数据散落在多个数据库表中（`interviews.conclusion`、`analyst.studySummary`、messages）
- 生成报告时需要从三个不同的地方拼接数据
- 如果访谈失败，部分数据会丢失
- 很难追溯完整的研究过程

一个典型的报告生成代码长这样：

```typescript
// 旧代码：需要查询多个数据源
async function generateReport(analystId: number) {
  const analyst = await prisma.analyst.findUnique({
    where: { id: analystId },
    include: {
      interviews: true, // 访谈结论
    },
  });

  const studySummary = analyst.studySummary; // 研究总结
  const interviews = analyst.interviews.map((i) => i.conclusion); // 访谈详情

  // 还需要从 messages 中读取 webSearch 的结果...

  return await llm.generateReport({
    studySummary,
    interviews,
    // webSearch results...
  });
}
```

### 问题 2：工具的不一致性

我们有两种用户研究工具：

```typescript
// interviewChat：一对一深度访谈
interviewChat({ personas: [id1, id2, id3], instruction })
  → 返回: { issues: [...] }  // 只返回错误，内容存在 DB

// scoutTaskChat：社交媒体观察
scoutTaskChat({ platform: "xiaohongshu", query: "咖啡" })
  → 返回: { insights: "...", observations: "..." }  // 返回完整内容
```

**问题**：

- `interviewChat` 不返回访谈内容，需要从数据库查询
- `scoutTaskChat` 返回完整内容，直接进入消息流
- 不一致的接口让 Agent 很难统一处理

### 问题 3：难以支持新的研究方式

当我们想要加入 `discussionChat`（群体讨论）时，发现需要：

1. 创建新的数据库表 `DiscussionTimeline`
2. 添加新的保存工具 `saveDiscussionSummary`
3. 修改报告生成逻辑以支持新的数据源
4. 更新 `studyLog` 生成逻辑

每增加一种研究方式，都要在多个地方做修改。系统越来越难以维护。

---

## 解决方案：消息驱动架构

我们做了一个关键决策：**让消息成为唯一的数据源**。

### 核心设计原则

```typescript
// 新架构：统一的消息流
┌─────────────────────┐
│ Study Agent         │
└──────┬──────────────┘
       │
       │  所有工具都返回 plainText 到消息流
       │
       ├─→ interviewChat ──→ { plainText: "访谈总结：..." }
       │                              ↓
       ├─→ discussionChat ──→ { plainText: "讨论总结：..." }
       │                              ↓
       ├─→ scoutTaskChat ──→ { plainText: "观察发现：..." }
       │                              ↓
       ├─→ webSearch ──→ { plainText: "搜索结果：..." }
       │                              ↓
       └─→ Agent 直接输出 ──→ "根据以上研究，我发现..."
                                      ↓
                              所有内容在 messages 中
                                      ↓
                    generateReport/Podcast 需要时从 messages 生成 studyLog
```

**三个关键变化**：

1. **统一输出格式**：所有工具都返回 `{ plainText: string }`
2. **Agent 直接输出**：不再调用 `saveAnalystStudySummary`，而是直接输出研究总结
3. **按需生成 studyLog**：报告/播客生成时自动从 messages 提取

### 实现细节

#### 1. 统一工具输出格式

我们修改了 `interviewChat`，让它和 `discussionChat` 返回相同的格式：

```typescript
// src/ai/tools/experts/interviewChat/index.ts

// 旧实现：只返回错误，内容存数据库
execute: async ({ personas, instruction }) => {
  const results = await Promise.all(personas.map((persona) => runInterview(persona, instruction)));

  return {
    issues: results.filter((r) => r.issue),
  };
};

// 新实现：生成总结并返回
execute: async ({ personas, instruction }) => {
  const results = await Promise.all(personas.map((persona) => runInterview(persona, instruction)));

  // 生成访谈总结（类似 discussionChat）
  const summary = await generateInterviewSummary(locale, results);

  const plainText =
    locale === "zh-CN"
      ? `访谈已完成，共 ${personas.length} 位参与者。\n\n${summary}`
      : `Interview completed with ${personas.length} participants.\n\n${summary}`;

  return {
    issues: results.filter((r) => r.issue),
    plainText, // 关键：返回总结到消息流
  };
};
```

现在 `interviewChat` 和 `discussionChat` 有了一致的接口：

```typescript
// 统一的工具接口
interface ResearchToolResult {
  plainText: string; // 总是返回人类可读的总结
  [key: string]: any; // 其他可选的结构化数据
}
```

#### 2. 移除保存工具，Agent 直接输出

我们删除了 `saveAnalystStudySummary` 和 `saveInnovationSummary` 工具，更新 Agent 的 prompt：

```typescript
// src/ai/prompt/study/study.ts

// 旧 prompt
`
<阶段4：报告生成>
1. 【第一步 - 必须】调用 saveAnalystStudySummary 保存研究总结
2. 【第二步 - 必须】调用 generateReport 生成报告
`
// 新 prompt
`
<阶段4：报告生成>
1. 【第一步 - 必须】直接输出详细的研究过程总结：
   • 【输出目的】将完整的研究过程以结构化方式输出，这些内容会被用于生成最终报告
   • 【输出内容要求】根据研究类型和商业研究规划，全面详细地输出研究过程，包括：
     - 联网搜索获得的关键市场信息和趋势
     - 用户研究（访谈/讨论）的核心发现和洞察
     - 数据分析结果和关键指标
     - 重要的用户反馈和引用
   • 【输出格式】使用清晰的 Markdown 格式，包含标题和列表，便于理解和后续报告生成

2. 【第二步 - 必须】调用 generateReport 生成报告
`;
```

Agent 现在直接输出研究总结到对话中，而不是通过工具调用保存到数据库。

#### 3. 从消息自动生成 studyLog

报告和播客生成时，我们自动从 messages 提取 studyLog：

```typescript
// src/app/(study)/agents/studyLog/index.ts

export async function generateAndSaveStudyLog({
  analyst,
  messages, // 完整的对话历史
  locale,
  abortSignal,
  statReport,
  logger,
}) {
  // 架构变更说明：
  // 1. 不再需要从 analyst.interviews.conclusion 读取访谈结论
  //    - 之前 interviewChat 只返回简短的 digest，需要从数据库读取详细的 conclusion
  //    - 现在 interviewChat 返回详细的 summary (与 discussionChat 一致)
  //    - 所有研究内容(包括访谈总结、讨论总结)都已包含在 messages 中
  // 2. 不再需要在 prologue 中放置研究的 topic, brief, summary 等详细信息
  //    - messages 已经包含完整的研究过程上下文
  //    - 只需一句简单的开场指令即可

  const studyLogMessages = [
    ...messages, // 完整的研究历史
    {
      role: "user",
      content:
        locale === "zh-CN"
          ? "请基于以上研究过程，生成一份详细的研究日志。"
          : "Please generate a detailed study log based on the research process above.",
    },
  ];

  const response = await streamText({
    model: llm("gemini-2.5-pro"),
    system: studyLogSystem({ locale }),
    messages: studyLogMessages,
    onFinish: async (result) => {
      await prisma.analyst.update({
        where: { id: analyst.id },
        data: { studyLog: result.text },
      });
    },
  });

  await response.consumeStream();
  return { studyLog: result.text };
}
```

在 `generateReport` 和 `generatePodcast` 中，我们添加了自动生成逻辑：

```typescript
// src/ai/tools/experts/generateReport/index.ts

execute: async ({ instruction, reportToken }, { messages }) => {
  let analyst = await getAnalyst(studyUserChatId);

  // 如果 studyLog 没有生成过，先生成
  if (!analyst.studyLog) {
    logger.info("studyLog not found, generating from messages");
    const { studyLog } = await generateAndSaveStudyLog({
      analyst,
      messages, // 关键：传入完整的对话历史
      locale,
      abortSignal,
      statReport,
      logger,
    });
    analyst = { ...analyst, studyLog };
  }

  // 使用 studyLog 生成报告
  await generateReport({ analyst, report, instruction });
};
```

---

## 实现效果

### 1. 通用的 Study Agent

现在一个 Study Agent 可以灵活使用不同的研究方法：

```typescript
// src/app/(study)/agents/studyAgentRequest.ts

const allTools = {
  [ToolName.webSearch]: webSearchTool(...),
  [ToolName.searchPersonas]: searchPersonasTool(...),
  [ToolName.scoutTaskChat]: scoutTaskChatTool(...),
  [ToolName.buildPersona]: buildPersonaTool(...),

  // 两种用户研究方式，统一接口
  [ToolName.interviewChat]: interviewChatTool(...),     // 深度访谈
  [ToolName.discussionChat]: discussionChatTool(...),   // 群体讨论

  [ToolName.generateReport]: generateReportTool(...),
  [ToolName.generatePodcast]: generatePodcastTool(...),
};
```

Agent 根据研究目标自动选择：

```markdown
## 推荐用户研究方式： 一对一深度访谈 (interviewChat)

推荐理由：本研究需要深入理解消费者购买护肤品时的个人决策逻辑、情感动机和使用场景

或

## 推荐用户研究方式： 群体讨论 (discussionChat)

推荐理由：本研究需要观察不同观点碰撞，模拟真实群体决策场景
```

### 2. 简化的数据流

数据流变得清晰简单：

```typescript
// 旧代码：多处读取
const analyst = await prisma.analyst.findUnique({
  where: { id },
  include: {
    interviews: true, // 需要 join
  },
});
const studySummary = analyst.studySummary;
const interviews = analyst.interviews.map((i) => i.conclusion);

// 新代码：单一来源
const analyst = await prisma.analyst.findUnique({
  where: { id },
});
if (!analyst.studyLog) {
  analyst.studyLog = await generateAndSaveStudyLog({ messages });
}
// studyLog 包含了所有研究内容
```

### 3. 易于扩展

添加新的研究方式只需要：

1. 实现新的工具，返回 `{ plainText: string }`
2. 添加到 Study Agent 的工具列表
3. 更新 prompt 让 Agent 知道何时使用

不需要修改报告生成、studyLog 生成或其他任何地方的代码。

---

## 数据对比

我们在生产环境追踪了这次变更的影响：

**代码复杂度**：

- 删除了 5 个专用保存工具（`saveAnalystStudySummary`, `saveInnovationSummary`, `saveInterviewConclusion` 等）
- 移除了 3 个数据源的拼接逻辑
- 简化了 28 个文件中的代码

**数据一致性**：

- 之前：访谈失败时约 15% 的数据会丢失
- 现在：所有内容在消息流中，失败时仍可追溯完整上下文

**维护成本**：

- 添加 `discussionChat` 只修改了 3 个文件（之前需要 12 个）
- 报告生成逻辑从 380 行减少到 185 行

---

## 技术权衡

### 我们选择了什么

**选择：消息作为唯一数据源**

传统 Agent 系统会构建复杂的状态管理：

```typescript
interface AgentState {
  interviews: Interview[];
  observations: Observation[];
  summary: Summary;
  context: Context;
}
```

我们选择让对话消息承载所有信息：

```typescript
// 所有研究内容都在这里
messages: UIMessage[]
```

**原因**：

- 对话本身就是最完整的上下文
- LLM 擅长从对话中提取结构化信息
- 避免了状态同步的复杂性

**代价**：

- `studyLog` 生成需要额外的 LLM 调用
- 长对话的 token 消耗较高

我们认为这个权衡是值得的，因为：

- 使用 Google Gemini 2.5 Pro 生成 studyLog，成本约 $0.02/次
- prompt cache 可以大幅降低长对话的重复 token 消耗
- 架构简化带来的维护收益远大于成本

### 我们没有选择什么

**没有选择：完全移除数据库存储**

我们仍然保留了关键数据的数据库存储：

- `analyst.studyLog`：生成后持久化，避免重复生成
- `interview.conclusion`：保留用于独立查看访谈内容
- `DiscussionTimeline`：保留用于前端实时展示

**原因**：

- 需要支持独立查看历史研究
- 前端需要结构化数据进行展示
- 某些场景需要直接查询而非通过 LLM 提取

**权衡**：

- 增加了一定的存储冗余
- 但提供了更好的用户体验

---

## 向 GEA 演进

这次重构是我们迈向 [GEA (Generative Enterprise Architecture)](./gea-architecture.md) 愿景的第一步。

### 当前状态

```
┌─────────────────────────────────────┐
│ Study Agent                         │
│ (单一 Agent，推理 + 执行)             │
├─────────────────────────────────────┤
│ • planStudy (规划)                   │
│ • interviewChat (访谈)               │
│ • discussionChat (讨论)              │
│ • scoutTaskChat (观察)               │
│ • generateReport (报告)              │
└─────────────────────────────────────┘
         ↓
    Messages
         ↓
  自动生成 studyLog
```

### 未来架构

```
┌───────────────────────┐
│ Reasoning Agent       │
│ (推理决策层)           │
├───────────────────────┤
│ • 分析用户意图         │
│ • 规划执行路径         │
│ • 准备 Context         │
│ • 监控并调整方向       │
│ • 决定停止时机         │
└──────────┬────────────┘
           │ Prepare Context
           │ Instruct Exec
┌──────────▼────────────┐
│ Execute Agent         │
│ (通用执行层)           │
├───────────────────────┤
│ • 接收 Context         │
│ • 动态加载 Skills      │
│ • 执行并返回结果       │
└──────────┬────────────┘
           │
┌──────────▼────────────┐
│ Skills Library        │
│ (可组合能力模块)       │
├───────────────────────┤
│ • scoutTask.md        │
│ • interview.md        │
│ • discussion.md       │
│ • reportGen.md        │
└───────────────────────┘
```

当前重构为未来演进奠定了基础：

✅ **统一接口**：工具返回 `plainText`，为 Skills 输出标准化做准备
✅ **消息驱动**：建立了 Reasoning 和 Execute 之间的通信协议
✅ **解耦依赖**：移除了对特定数据库字段的依赖
✅ **按需生成**：`studyLog` 自动生成机制是 Context 动态管理的雏形

下一步，我们将：

1. 分离 Reasoning 和 Execute 逻辑
2. 将工具转化为可动态加载的 Skills
3. 构建 Context System（类似 DAM）管理长期和临时的研究资产

---

## 经验教训

### 1. 从真实问题出发

这次重构不是为了追求架构的优雅，而是解决实际遇到的问题：

- 添加 `discussionChat` 时发现需要修改 12 个文件
- 报告生成时需要从 3 个不同的地方读取数据
- 访谈失败时部分数据会丢失

**教训**：好的架构来自于对痛点的深刻理解，而不是对模式的盲目套用。

### 2. 渐进式演进

我们没有一次性重写整个系统，而是分阶段进行：

**第一阶段（当前）**：

- 统一工具输出格式
- 移除保存工具
- 实现自动生成 studyLog

**第二阶段（规划中）**：

- 分离 Reasoning 和 Execute
- Skills 动态加载
- Context System

**教训**：大的架构变更需要分步执行，每一步都要能独立交付价值。

### 3. 保持向后兼容

我们保留了数据库中的 `studySummary` 字段：

```prisma
// prisma/schema.prisma
model Analyst {
  studySummary String @db.Text // 目前已经用不到了
  studyLog     String @default("") @db.Text
}
```

虽然代码中不再使用 `studySummary`，但保留字段让我们可以：

- 访问历史研究数据
- 如果新架构有问题，快速回滚

**教训**：在重构时为自己留后路，避免不可逆的变更。

### 4. 通过测试保证质量

我们为关键路径添加了集成测试：

```typescript
describe("Message-driven architecture", () => {
  it("should generate studyLog from messages", async () => {
    const messages = createMockMessages();
    const { studyLog } = await generateAndSaveStudyLog({
      analyst: mockAnalyst,
      messages,
      locale: "zh-CN",
    });

    expect(studyLog).toContain("访谈总结");
    expect(studyLog).toContain("讨论发现");
  });

  it("should auto-generate studyLog when missing", async () => {
    const analyst = await createAnalystWithoutStudyLog();
    await generateReport({ analyst, messages });

    const updated = await getAnalyst(analyst.id);
    expect(updated.studyLog).toBeDefined();
  });
});
```

**教训**：重构时要有充分的测试覆盖，确保不引入回归问题。

---

## 参考资料

- [GEA Architecture 文档](../whywebuild/gea-architecture.md)
- [PR #263: 添加 discussionChat 并完成 studyLog 架构迁移](https://github.com/bmrlab/atypica-llm-app/pull/263)
- [Anthropic's Agent Architecture](https://www.anthropic.com/research/building-effective-agents)
- [Vercel AI SDK - Message Management](https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot-message-persistence)

---

## 致谢

这次架构演进得益于：

- Anthropic 关于 Universal Agent + Skills Library 的启发
- Vercel AI SDK 提供的消息持久化模式
- 团队在实践中对问题的深入思考

特别感谢所有参与测试和反馈的用户。

---

**作者**：atypica.AI Engineering Team

_atypica - 让 AI 真正理解用户_
