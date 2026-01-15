# Fast Insight Agent - 播客驱动的快速洞察研究

## 核心理念

Fast Insight Agent 是 atypica.AI 的播客优先研究智能体，专注于**快速生成高质量、有深度、吸引人的播客内容**。与传统研究报告不同，Fast Insight Agent 将洞察转化为可听的音频内容，让用户在通勤、运动、做家务时也能高效获取商业和时事洞察。

### 设计哲学

**1. 播客优先，报告可选**

传统研究以文字报告为主要输出，Fast Insight Agent 反其道而行：

- **主要输出**：播客音频 + 脚本（15-20分钟，结构化对话）
- **可选输出**：高信息密度的快速阅读报告（补充详细数据）

**2. 速度与深度兼顾**

- **最大步数**：10步（vs 常规研究的20+步）
- **优化工具链**：7个精选工具（vs 常规研究的20+工具）
- **并行执行**：深度研究（deepResearch）+ 播客规划（planPodcast）一次性完成

**3. 严格工作流，确保质量**

Fast Insight Agent 采用 5 阶段线性流程，每个阶段有明确的验证检查点，AI 无法跳过任何必需步骤：

```
主题理解 → 播客规划 → 深度研究 → 播客生成 → 研究结束
   ↓          ↓          ↓          ↓          ↓
webSearch  planPodcast deepResearch generatePodcast (可选:report)
```

---

## 对比总览：Fast Insight vs 常规研究

| **维度** | **Fast Insight Agent** | **Study Agent (常规研究)** |
|----------|------------------------|---------------------------|
| **主要输出** | 播客音频 + 脚本 | 研究报告 |
| **触发方式** | 用户明确要求"播客"/"音频内容" | 通用研究需求 |
| **研究类型 (kind)** | `fastInsight`（固定） | 7种类型（testing/insights/creation/planning/misc/productRnD/fastInsight） |
| **最大步数** | 10步 | 20+步 |
| **工具数量** | 7个精选工具 | 20+个完整工具集 |
| **执行速度** | 快（5-10分钟） | 较慢（15-30分钟） |
| **主力模型** | Claude Sonnet 4.5 | Claude Sonnet 4.5 |
| **规划模型** | Gemini 2.5 Pro（planPodcast） | Claude Sonnet 4（planStudy） |
| **webSearch限制** | 最多3次（planPodcast前仅1次） | 无硬性限制 |
| **研究方法** | 不支持（无interviewChat/discussionChat/scoutTaskChat） | 支持（一对一访谈、群体讨论、社交媒体观察） |
| **AI Persona** | 不使用 | 大量使用（Tier 1-3质量体系） |
| **适用场景** | 热点话题、快速洞察、内容营销 | 深度商业决策、产品创新、用户研究 |

### 核心差异：研究方法

| **研究方法** | **Fast Insight** | **Study Agent** |
|-------------|------------------|-----------------|
| **interviewChat** （一对一深度访谈） | ❌ 不支持 | ✅ 5-10人，30分钟/人 |
| **discussionChat** （群体讨论） | ❌ 不支持 | ✅ 3-8人，观点碰撞 |
| **scoutTaskChat** （社交媒体观察） | ❌ 不支持 | ✅ 3阶段：观察→推理→验证 |
| **deepResearch** （深度研究） | ✅ 唯一研究方法 | ✅ 补充方法之一 |

**关键洞察**：
- **Fast Insight**：通过 `deepResearch`（网络搜索 + X搜索 + AI推理）快速获取洞察，适合时效性强的话题
- **Study Agent**：通过 AI Persona 模拟真实人类，深度访谈获取主观情感和决策逻辑，适合需要理解"为什么"的研究

---

## 详细功能解析

### 一、工作流程：5阶段线性执行

#### 阶段 1：主题理解和明确

**目标**：快速了解研究主题的背景信息

**工具**：
- `webSearch`（Perplexity provider）：快速收集背景信息、最新动态、关键概念

**关键限制**：
- **仅限使用 1 次** webSearch（在 planPodcast 之前）
- 所有收集的信息必须详细记录，后续整合到 planPodcast

**验证检查点**：
- ✅ 已通过 webSearch 收集足够背景信息
- ✅ 已充分理解用户的研究主题和目标

**实现细节**：
```typescript
// src/app/(study)/agents/configs/fastInsightAgentConfig.ts
customPrepareStep: async ({ messages }) => {
  const toolUseCount = calculateToolUsage(messages);

  // Limit webSearch usage (fast insight doesn't have planStudy)
  if ((toolUseCount[StudyToolName.webSearch] ?? 0) >= 3) {
    activeTools = (Object.keys(tools) as (keyof TOOLS)[]).filter(
      (toolName) => toolName !== StudyToolName.webSearch,
    );
  }

  return { messages, activeTools };
}
```

---

#### 阶段 2：播客规划

**目标**：规划播客内容策略和深度搜索策略

**工具**：
- `planPodcast`：
  - **模型**：Gemini 2.5 Pro（快速且支持 Google Search grounding）
  - **集成工具**：google_search（MODE_DYNAMIC，dynamicThreshold=0，确保一定会搜索）
  - **关键参数**：
    - `background`: 包含 webSearch 收集的所有背景信息
    - `question`: 用户的研究问题或主题

**输出内容**：
- **播客内容规划**：
  - 播客主题和核心观点
  - 章节结构和重点内容
  - 目标受众分析
- **搜索策略规划**：
  - 需要深入研究的问题列表
  - 信息来源和搜索关键词
  - 研究深度要求

**重要提示**：
- 如果 Plan Mode 已完成（对话历史中有明确话题和受众），planPodcast 负责**细化大纲和研究深度**，不重新分析受众角度
- 研究元数据（topic, kind=fastInsight, locale）已在 Plan Mode 通过 `saveAnalyst` 设置完成

**验证检查点**：
- ✅ 已成功调用 planPodcast 工具
- ✅ 播客内容策略和搜索策略已规划完成

**实现细节**：
```typescript
// src/app/(study)/tools/planPodcast/index.ts
const response = streamText({
  model: llm("gemini-2.5-pro"),
  tools: {
    google_search: google.tools.googleSearch({
      mode: "MODE_DYNAMIC",
      dynamicThreshold: 0, // 确保一定会搜索
    }),
  },
  system: planPodcastSystem({ locale }),
  messages: [
    {
      role: "user",
      content: planPodcastPrologue({ locale, background, question }),
    },
  ],
  onFinish: async (result) => {
    resolve({
      reasoning: result.reasoningText ?? "",
      text: result.text ?? "",
      plainText: result.text ?? "",
    });
  },
});
```

---

#### 阶段 3：深度研究

**目标**：基于 planPodcast 规划的搜索策略，执行深度研究获取全面洞察

**工具**：
- `deepResearch`（MCP 工具）：
  - **能力**：先进 AI 模型 + 网络搜索 + X（Twitter）搜索
  - **关键参数**：
    - `query`: 基于 planPodcast 规划构建的综合性研究查询
    - `expert`: 可选，默认 "auto"，自动选择最适合的专家
  - **执行时间**：可能需要几分钟（深度搜索 + AI 推理）

**输出内容**：
- 全面的深度研究结果
- 关键洞察、数据、趋势
- 结构化的信息组织

**验证检查点**：
- ✅ 已成功调用 deepResearch 工具
- ✅ 深度研究结果已获得
- ✅ 研究结果包含足够的洞察和信息用于播客生成

---

#### 阶段 4：播客生成

**目标**：调用工具生成完整的播客脚本和音频

**工具**：
- `generatePodcast`：
  - **无需参数**：工具自动从研究过程加载深度研究结果
  - **数据来源**：
    - `analyst.topic`: 研究主题
    - `analyst.studyLog`: 从消息自动生成的研究日志（如不存在，自动调用 `generateAndSaveStudyLog`）
    - `analyst.kind`: 研究类型（fastInsight）
  - **Podcast Kind 判断**：
    ```typescript
    const podcastKind = analyst.kind === "fastInsight"
      ? PodcastKind.fastInsight
      : PodcastKind.opinionOriented;
    ```

**输出内容**：
- `podcastToken`: 用于访问生成的播客
- 播客脚本（存储在 `AnalystPodcast.script`）
- 播客音频（TTS 生成，存储在 `AnalystPodcast.extra.audioObjectUrl`）

**验证检查点**：
- ✅ 已成功调用 generatePodcast 工具
- ✅ 播客已生成完成（包括脚本和音频）
- ✅ 已获得 podcastToken 用于访问播客

**实现细节**：
```typescript
// src/app/(study)/tools/generatePodcast/index.ts
// 如果 studyLog 没有生成过，先生成
if (!analyst.studyLog) {
  const { studyLog } = await generateAndSaveStudyLog({
    analyst,
    messages,
    locale,
    abortSignal,
    statReport,
    logger,
  });
  analyst = { ...analyst, studyLog };
}

// Determine podcast kind based on analyst kind
const podcastKind = analyst.kind === "fastInsight"
  ? PodcastKind.fastInsight
  : PodcastKind.opinionOriented;

// Generate podcast
const analystPodcast = await generatePodcast({
  userId: analyst.userId,
  analystId: analyst.id,
  topic: analyst.topic ?? analyst.brief,
  researchContext: analyst.studyLog,
  podcastKind: {
    kind: podcastKind,
    reason: analyst.kind === "fastInsight"
      ? "Fast insight study - using fastInsight podcast type"
      : "Fixed to opinionOriented for study",
  },
  // ...
});
```

---

#### 阶段 5（可选）：报告生成

**目标**：如用户明确需要更深入的结构化分析，生成高信息密度的研究报告

**工具**：
- `generateReport`（可选）：
  - **使用时机**：仅在用户明确请求或需要更深入的结构化分析时使用
  - **关键参数**：`instruction: "生成信息密度高的快速阅读报告"`
  - **报告风格**：fastInsight 风格（强调信息密度和快速阅读，而非深度美学设计）

**输出内容**：
- `reportToken`: 用于访问生成的报告
- 结构化研究报告（Markdown 格式）

**注意事项**：
- 报告生成是**可选的**，不是必需步骤
- 仅在用户明确需要更详细的书面分析时才使用
- 报告会补充播客内容，提供更密集的信息展示

---

#### 阶段 6：研究结束

**任务**：
- 简洁告知研究已完成
- 提供 `podcastToken`，引导用户访问生成的播客内容
- **避免**提供任何研究结论的详细描述（引导用户直接收听播客获取完整内容）

**积极引导用户**：
- 鼓励用户收听生成的播客，并提供反馈
- 如用户希望更深入的结构化分析，可以使用 `generateReport` 工具
- 如用户提出新研究需求，友善说明需要开启全新研究会话
- 如用户对播客或报告内容有修改需求，可以重新生成相应内容

**工具限制**（防止不必要的额外操作）：
```typescript
// src/app/(study)/agents/configs/fastInsightAgentConfig.ts
customPrepareStep: async ({ messages }) => {
  const toolUseCount = calculateToolUsage(messages);

  // After report/podcast generation, only allow specific tools
  if (
    (toolUseCount[StudyToolName.generateReport] ?? 0) > 0 ||
    (toolUseCount[StudyToolName.generatePodcast] ?? 0) > 0
  ) {
    activeTools = [
      StudyToolName.generateReport,
      StudyToolName.generatePodcast,
      StudyToolName.toolCallError,
    ];
  }

  return { messages, activeTools };
}
```

---

### 二、技术架构

#### 1. Agent 配置

**文件位置**：`src/app/(study)/agents/configs/fastInsightAgentConfig.ts`

**关键配置**：
```typescript
export async function createFastInsightAgentConfig(
  params: FastInsightAgentConfigParams,
): Promise<AgentRequestConfig<TOOLS>> {
  return {
    model: "claude-sonnet-4-5",           // 主模型
    systemPrompt: fastInsightSystem({ locale }),
    tools: buildFastInsightTools(params), // 7个精选工具
    maxSteps: 10,                         // 快速执行

    specialHandlers: {
      customPrepareStep: async ({ messages }) => {
        // 动态工具控制：
        // 1. 限制 webSearch 使用（最多3次）
        // 2. 报告/播客生成后限制可用工具
      },
    },
  };
}
```

**7个精选工具**：
```typescript
function buildFastInsightTools(params) {
  return {
    [StudyToolName.webFetch]: webFetchTool({ locale }),
    [StudyToolName.webSearch]: webSearchTool({ provider: "perplexity" }),
    [StudyToolName.planPodcast]: planPodcastTool({ studyUserChatId }),
    [StudyToolName.generatePodcast]: generatePodcastTool({ studyUserChatId }),
    [StudyToolName.generateReport]: generateReportTool({ studyUserChatId }),
    [StudyToolName.deepResearch]: deepResearchTool({ userId }),
    [StudyToolName.toolCallError]: toolCallError,
  };
}
```

---

#### 2. 系统提示词

**文件位置**：`src/app/(study)/prompt/fastInsight.ts`

**核心指令**：
```markdown
<CRITICAL_INSTRUCTIONS>
1. 绝不跳过必需的工具或研究阶段
2. 始终按照指定顺序严格遵循研究工作流程
3. 如对任何指令不确定，默认遵循各阶段中的明确要求
4. 本研究的主要目标是生成高质量、有深度、吸引人的播客内容
</CRITICAL_INSTRUCTIONS>

你是 atypica.AI，一个时事和商业洞察智能体，你的使命是自主地用最新最热的信息来源，帮助用户发现时事和商业的深度洞察，并制作吸引听众且有内容深度的播客。

<工作流程>
1. 主题理解和明确：通过 webSearch 快速了解背景
2. 播客规划：使用 planPodcast 规划播客内容策略和搜索策略
3. 深度研究：使用 deepResearch 进行深度研究
4. 播客生成：根据研究结果生成播客脚本和音频
5. 可选报告生成：如用户需要，可基于研究生成结构化报告
6. 研究结束
</工作流程>

<MUST_NOT_DO>
1. 不得在未完成所有必要工具调用的情况下提前结束研究
2. 不得在播客生成后继续进行研究或提供额外分析
3. 不得跳过任何必需的工具调用步骤
4. 不得假装你能看到没有搜索到的内容
5. 不得在 planPodcast 之前多次使用 webSearch
</MUST_NOT_DO>
```

---

#### 3. 数据模型

**Analyst**（研究分析师配置）：
```typescript
{
  kind: "fastInsight",              // 研究类型（固定）
  locale: "zh-CN" | "en-US",        // 内容语言
  brief: string,                    // 用户的初始问题
  topic: string,                    // 从 planPodcast 生成的主题
  studySummary: string,             // 存储 deepResearch 结果（已废弃，改用 studyLog）
  studyLog: string,                 // 从消息自动生成的执行日志
  attachments: FileAttachment[],    // 用户上传的参考资料
}
```

**AnalystPodcast**（播客存储）：
```typescript
{
  token: string,                    // 访问令牌（nanoid(10)）
  analystId: number,                // 关联的 Analyst ID
  script: string,                   // 播客脚本（Markdown 格式）
  extra: {
    audioObjectUrl?: string,        // TTS 生成的音频文件 URL
  },
  generatedAt: Date,                // 生成时间
}
```

**PodcastKind**（播客类型）：
```typescript
type PodcastKind =
  | "deepDive"          // 深度挖掘（学术风格）
  | "opinionOriented"   // 观点导向（常规研究）
  | "fastInsight"       // 快速洞察（Fast Insight Agent 专用）
  | "debate";           // 辩论风格

// Fast Insight Agent 固定使用 fastInsight 类型
const podcastKind = analyst.kind === "fastInsight"
  ? PodcastKind.fastInsight
  : PodcastKind.opinionOriented;
```

---

#### 4. 工具链详解

##### webSearch（Perplexity）

**用途**：快速收集背景信息、最新动态、关键概念

**关键特性**：
- **Provider**：Perplexity（优化的时效性和准确性）
- **使用限制**：最多 3 次（planPodcast 之前仅 1 次）

**实现**：
```typescript
[StudyToolName.webSearch]: webSearchTool({
  provider: "perplexity",
  locale,
  abortSignal,
  statReport,
  logger,
})
```

---

##### planPodcast（Gemini 2.5 Pro）

**用途**：规划播客内容策略和深度搜索策略

**关键特性**：
- **模型**：Gemini 2.5 Pro（快速、高质量、支持 Google Search grounding）
- **集成工具**：google_search（MODE_DYNAMIC，dynamicThreshold=0）
- **输出**：播客内容规划 + 搜索策略规划

**关键参数**：
```typescript
{
  background: string,  // 包含 webSearch 收集的所有背景信息
  question: string,    // 用户的研究问题或主题
}
```

**实现细节**：
```typescript
// src/app/(study)/tools/planPodcast/index.ts
const response = streamText({
  model: llm("gemini-2.5-pro"),
  tools: {
    google_search: google.tools.googleSearch({
      mode: "MODE_DYNAMIC",
      dynamicThreshold: 0, // 确保一定会搜索
    }),
  },
  system: planPodcastSystem({ locale }),
  messages: [
    {
      role: "user",
      content: planPodcastPrologue({ locale, background, question }),
    },
  ],
  onFinish: async (result) => {
    const { tokens, extra } = calculateStepTokensUsage(result);
    await statReport("tokens", tokens, {
      reportedBy: "planPodcast tool",
      ...extra,
    });
    resolve({
      reasoning: result.reasoningText ?? "",
      text: result.text ?? "",
      plainText: result.text ?? "",
    });
  },
});
```

---

##### deepResearch（MCP 工具）

**用途**：执行深度研究，使用先进 AI 模型结合网络搜索和 X（Twitter）搜索

**关键特性**：
- **能力**：多源信息聚合（网络 + 社交媒体 + AI 推理）
- **执行时间**：可能需要几分钟（深度搜索 + 分析）
- **专家模式**：可选 "auto" 或指定专家类型

**关键参数**：
```typescript
{
  query: string,   // 基于 planPodcast 规划的综合性研究查询
  expert?: string, // 可选，默认 "auto"
}
```

---

##### generatePodcast

**用途**：生成完整的播客脚本和音频

**关键特性**：
- **无需参数**：自动从研究过程加载 `studyLog`
- **Podcast Kind**：根据 `analyst.kind` 自动判断（fastInsight → fastInsight）
- **TTS 生成**：自动调用 TTS 服务生成音频文件

**数据流**：
```
messages → generateAndSaveStudyLog → analyst.studyLog
                                            ↓
                                     generatePodcast
                                            ↓
                        AnalystPodcast (script + audioObjectUrl)
```

**实现细节**：
```typescript
// src/app/(study)/tools/generatePodcast/index.ts
execute: async ({ podcastToken }, { messages }) => {
  // 获取 analyst
  const userChat = await prisma.userChat.findUniqueOrThrow({
    where: { id: studyUserChatId, kind: "study" },
    select: {
      analyst: {
        select: {
          id: true,
          userId: true,
          topic: true,
          brief: true,
          studyLog: true,
          kind: true,
        },
      },
    },
  });

  let analyst = userChat.analyst;

  // 如果 studyLog 没有生成过，先生成
  if (!analyst.studyLog) {
    const { studyLog } = await generateAndSaveStudyLog({
      analyst,
      messages,
      locale,
      abortSignal,
      statReport,
      logger,
    });
    analyst = { ...analyst, studyLog };
  }

  // 判断 podcast kind
  const podcastKind = analyst.kind === "fastInsight"
    ? PodcastKind.fastInsight
    : PodcastKind.opinionOriented;

  // 生成播客
  const analystPodcast = await generatePodcast({
    userId: analyst.userId,
    analystId: analyst.id,
    topic: analyst.topic ?? analyst.brief,
    researchContext: analyst.studyLog,
    podcastKind: {
      kind: podcastKind,
      reason: analyst.kind === "fastInsight"
        ? "Fast insight study - using fastInsight podcast type"
        : "Fixed to opinionOriented for study",
    },
    podcastToken,
    locale,
    abortSignal,
    statReport,
    logger,
  });

  return {
    podcastToken: analystPodcast.token,
    plainText: `Podcast generated successfully with token: ${analystPodcast.token}`,
  };
}
```

---

##### generateReport（可选）

**用途**：基于研究生成高信息密度的结构化研究报告

**关键特性**：
- **可选工具**：仅在用户明确请求时使用
- **报告风格**：fastInsight 风格（信息密度高、快速阅读）
- **数据来源**：自动从 `studyLog` 加载研究结果

**关键参数**：
```typescript
{
  instruction: string,  // 简要说明报告需求
  reportToken: string,  // 访问令牌
}
```

---

### 三、与 Plan Mode 的集成

Fast Insight Agent 不是独立运行的，而是通过 **Plan Mode**（意图澄清层）触发和配置。

#### Plan Mode 判断逻辑

**文件位置**：`src/app/(study)/prompt/planMode.ts`

**触发条件**（满足任一即可）：
```markdown
🎯 **优先级 1: Fast Insight Agent (kind=fastInsight)**
触发条件（满足任一即可）：
• 明确要求"播客"/"音频内容"/"可听的内容"
• 明确要求"快速洞察"/"fast insight"
• 时效性极强的话题（如突发新闻、热点事件）
• 用户提到"通勤时听"/"做家务时听"等场景

不适用场景：
• 需要深度用户访谈或群体讨论
• 需要长期跟踪观察（如社交媒体观察）
• 需要 AI Persona 模拟真实用户行为
```

#### Plan Mode 工作流

```
用户输入
   ↓
webSearch（1-2次，收集背景）
   ↓
makeStudyPlan（展示完整计划）
   ├─ locale: zh-CN | en-US | misc
   ├─ kind: fastInsight（自动判断）
   ├─ role: 专家角色（如"商业分析师"）
   ├─ topic: 完整研究主题
   └─ planContent: 完整研究计划（Markdown）
   ↓
用户确认
   ↓
saveAnalyst（保存研究意图）
   ↓
Fast Insight Agent 开始执行
```

**关键字段**：
```typescript
// src/app/(study)/tools/makeStudyPlan/types.ts
export const makeStudyPlanInputSchema = z.object({
  locale: z.enum(["zh-CN", "en-US", "misc"]),
  kind: z.enum([
    "productRnD",    // 产品研发
    "fastInsight",   // 快速洞察（播客驱动）← 这里
    "testing",       // A/B测试、假设验证
    "insights",      // 理解行为、发现问题
    "creation",      // 创意生成、方案设计
    "planning",      // 战略规划、框架设计
    "misc"           // 通用研究
  ]),
  role: z.string().max(100),   // 专家角色
  topic: z.string(),            // 完整研究主题
  planContent: z.string(),      // 完整研究计划
});
```

---

## 真实案例演示

### 案例 1：热点话题分析 - "2025 年春节消费趋势"

**用户请求**：
```
我想了解 2025 年春节的消费趋势，能帮我生成一个播客吗？重点关注年轻人的消费行为变化。
```

**Plan Mode 判断**：
- **触发条件**：明确要求"生成一个播客"
- **kind 判断**：`fastInsight`
- **locale 判断**：`zh-CN`（中文内容）
- **role 生成**：商业趋势分析师
- **topic 生成**：2025 年春节消费趋势研究：年轻人消费行为变化分析

**Fast Insight Agent 执行**：

**阶段 1：主题理解**（1 分钟）
```
webSearch: "2025 春节消费趋势 年轻人"
→ 收集到：
  • 小红书数据：反向春运增长 30%
  • 美团数据：年夜饭预订同比增长 50%
  • 艾瑞咨询：Z世代春节消费意愿调研
  • 淘宝天猫：新年货趋势报告
```

**阶段 2：播客规划**（2 分钟）
```
planPodcast:
  background: [webSearch 收集的所有信息]
  question: "2025 年春节消费趋势：年轻人消费行为变化"
→ Gemini 2.5 Pro 规划：
  【播客结构】
  1. 开场：2025 春节的"新玩法"（反向春运、新年货）
  2. 核心趋势：年轻人消费的三大变化
     - 从"回家过年"到"带家人出游"
     - 从"买年货"到"买体验"
     - 从"攀比"到"悦己"
  3. 数据支撑：小红书、美团、淘宝数据
  4. 案例故事：95后小张的春节消费清单
  5. 结尾：给品牌的三点启示

  【搜索策略】
  - 重点搜索："反向春运"、"新年货"、"Z世代春节消费"
  - 数据来源：社交媒体（小红书、抖音）+ 电商平台报告
  - 深度：中等（案例 + 数据 + 趋势分析）
```

**阶段 3：深度研究**（3 分钟）
```
deepResearch:
  query: "2025 春节消费趋势 年轻人 反向春运 新年货 体验式消费"
→ MCP 工具执行：
  • 网络搜索：艾瑞、QuestMobile、CBNData 报告
  • X 搜索：#春节消费 #反向春运 话题讨论
  • AI 推理：总结关键洞察和趋势
→ 输出 studyLog：
  【核心洞察】
  1. 反向春运成主流（30%+ 年轻人选择）
  2. 新年货三大趋势：健康、体验、个性化
  3. 消费动机从"攀比"到"悦己"（70% 受访者）
  4. 社交媒体驱动消费决策（小红书 MAU 增长 40%）
  5. 品牌机会：抓住"悦己经济"+ "体验经济"
```

**阶段 4：播客生成**（2 分钟）
```
generatePodcast:
  topic: "2025 年春节消费趋势：年轻人消费行为变化分析"
  researchContext: [studyLog]
  podcastKind: fastInsight
→ 生成：
  • 播客脚本（6000字，结构化对话）
  • TTS 音频（15分钟，支持中英文）
  • podcastToken: "abc123xyz"
```

**阶段 5：研究结束**
```
AI 回复：
"✅ 播客已生成完成！

🎧 **收听播客**：[播客播放器链接]

📝 **播客脚本**：[脚本查看链接]

⏱️ **时长**：约 15 分钟

本播客深入分析了 2025 年春节年轻人的消费行为变化，包含：
• 反向春运、新年货等核心趋势
• 小红书、美团、淘宝等真实数据支撑
• 95后春节消费案例故事
• 给品牌的三点实战启示

通勤时、做家务时都可以听！如需更详细的数据报告，我可以为你生成一份结构化的研究报告。"
```

**用户反馈**：
```
用户："能再生成一份报告吗？我想看具体的数据。"

AI 调用 generateReport:
  instruction: "生成信息密度高的快速阅读报告，重点展示数据和趋势"
→ 生成：
  • 报告 Token: "def456uvw"
  • 报告内容：Markdown 格式，包含图表、数据表格、趋势分析

AI 回复：
"✅ 研究报告已生成！

📊 **查看报告**：[报告查看链接]

报告包含：
• 10+ 数据图表
• 5大核心趋势分析
• 3个真实案例深度解读
• 品牌实战建议清单

报告采用信息密度高的快速阅读格式，5-10分钟即可掌握核心要点。"
```

---

### 案例 2：商业洞察 - "OpenAI 最新发布会分析"

**用户请求**：
```
OpenAI 刚开了发布会，能帮我快速了解一下重点吗？最好是播客形式，我在开车。
```

**Plan Mode 判断**：
- **触发条件**：明确要求"播客形式" + 场景"在开车"
- **kind 判断**：`fastInsight`
- **时效性**：极强（突发事件）
- **locale 判断**：`zh-CN`
- **role 生成**：科技行业分析师

**Fast Insight Agent 执行**：

**阶段 1-3**（6 分钟）：
```
webSearch → planPodcast → deepResearch
→ 收集信息：
  • 官方发布会录像和文字稿
  • X（Twitter）热议话题和专家评论
  • 科技媒体（TechCrunch, The Verge）报道
  • 竞品分析（Google, Anthropic 近期动态）
```

**阶段 4**（2 分钟）：
```
generatePodcast:
  podcastKind: fastInsight
→ 生成 15 分钟播客：
  1. 开场：OpenAI 发布会的 3 大重磅消息
  2. 技术解析：GPT-5 的能力突破
  3. 商业影响：对 AI 行业的 5 大影响
  4. 竞品对比：OpenAI vs Google vs Anthropic
  5. 结尾：普通用户和开发者如何应对
```

**用户体验**：
- **生成时间**：8 分钟（vs 常规研究 20+ 分钟）
- **播客时长**：15 分钟（适合通勤场景）
- **内容质量**：高（深度研究 + 多源验证）

---

## 能力边界

### ✅ Fast Insight Agent 能做什么

**1. 快速时效性话题研究**
- 突发新闻分析（如发布会、财报、政策发布）
- 热点趋势洞察（如消费趋势、行业动态）
- 快速知识学习（如新技术科普、行业入门）

**2. 播客优先内容生成**
- 15-20 分钟结构化播客音频
- 高质量播客脚本（可独立阅读）
- 可选的高信息密度研究报告

**3. 多源信息聚合**
- 网络搜索（Perplexity）
- Google Search（Gemini 2.5 Pro grounding）
- X（Twitter）搜索（deepResearch）
- AI 深度推理和趋势分析

**4. 快速执行**
- 最大 10 步（vs 常规研究 20+ 步）
- 5-10 分钟完成研究和播客生成
- 优化的工具链（7 个精选工具）

---

### ❌ Fast Insight Agent 不能做什么

**1. 深度用户研究（需要 Study Agent）**
- ❌ 一对一深度访谈（interviewChat）
- ❌ 群体讨论（discussionChat）
- ❌ 社交媒体深度观察（scoutTaskChat）

**原因**：Fast Insight Agent 不使用 AI Persona，无法模拟真实用户行为和主观情感。

**2. 长期跟踪研究**
- ❌ 多阶段研究（如 Scout Agent 的 3 阶段：观察→推理→验证）
- ❌ 持续观察和数据积累

**原因**：Fast Insight Agent 专注于快速单次研究，不支持多阶段迭代。

**3. 高度定制化研究**
- ❌ 复杂的研究框架设计（如 JTBD、KANO、用户旅程地图）
- ❌ 多维度用户画像构建

**原因**：Fast Insight Agent 采用固定的 5 阶段流程，不支持自定义研究方法。

**4. 超大规模数据分析**
- ❌ 50-100 个 AI Persona 的大规模访谈
- ❌ 定量数据分析和统计建模

**原因**：Fast Insight Agent 专注于定性洞察和快速内容生成，不支持大规模定量分析。

---

### 🤔 何时选择 Fast Insight vs Study Agent？

| **场景** | **推荐 Agent** | **原因** |
|---------|---------------|---------|
| 热点话题快速分析（如突发新闻） | ✅ Fast Insight | 时效性强，播客形式便于快速传播 |
| 内容营销（如行业洞察播客） | ✅ Fast Insight | 播客优先，15 分钟高质量内容 |
| 知识学习（如新技术科普） | ✅ Fast Insight | 快速生成，适合通勤场景 |
| 产品决策（如功能优先级排序） | ❌ Study Agent | 需要深度用户访谈（interviewChat） |
| 用户痛点研究（如购买动机） | ❌ Study Agent | 需要群体讨论（discussionChat）+ AI Persona |
| 市场机会发现（如新赛道探索） | ❌ Study Agent | 需要社交媒体深度观察（scoutTaskChat） |
| 品牌定位研究（如情感地图） | ❌ Study Agent | 需要 50+ AI Persona 大规模访谈 |

**核心判断标准**：
1. **需要播客吗？** → 是 → Fast Insight
2. **需要深度理解"为什么"吗？** → 是 → Study Agent
3. **需要大规模用户样本吗？** → 是 → Study Agent
4. **时效性强、内容营销？** → 是 → Fast Insight

---

## 最佳实践

### 一、输入优化

**1. 明确播客需求**

✅ **好的输入**：
```
"我想了解 2025 年 AI 行业的趋势，能帮我生成一个 15 分钟的播客吗？重点关注 LLM、Agent、多模态三个方向。"
```

❌ **不好的输入**：
```
"AI 行业趋势"
```

**改进点**：
- 明确要求"播客"（触发 Fast Insight Agent）
- 指定时长（15 分钟）
- 列出关注重点（LLM、Agent、多模态）

---

**2. 提供背景和上下文**

✅ **好的输入**：
```
"我是一家 SaaS 公司的产品经理，想了解 2025 年企业 AI 应用的趋势。能帮我生成一个播客吗？重点关注：
1. 哪些 AI 功能最受企业客户欢迎
2. 企业客户的付费意愿如何
3. 竞品在做什么

播客需要有数据支撑，不要太空泛。"
```

❌ **不好的输入**：
```
"企业 AI 应用趋势"
```

**改进点**：
- 明确角色（产品经理）
- 列出具体问题（3 个关注点）
- 指定内容要求（数据支撑）

---

**3. 上传参考资料**

✅ **好的输入**：
```
"我上传了 3 份行业报告（图片），能帮我基于这些报告生成一个播客吗？重点总结：
1. 各报告的核心观点
2. 共同趋势和矛盾点
3. 对我们公司的启示

[附件：麦肯锡报告.png, Gartner报告.png, 艾瑞报告.png]"
```

**技术支持**：
- Fast Insight Agent 支持文件附件（图片、文档）
- 图片会通过 Vision API 解析
- 文档会提取文本内容

---

### 二、交互优化

**1. 分阶段查看进度**

Fast Insight Agent 会实时显示当前执行阶段：

```
✅ 阶段 1：主题理解和明确
   正在使用 webSearch 收集背景信息...

✅ 阶段 2：播客规划
   正在使用 planPodcast 规划播客内容策略...

🔄 阶段 3：深度研究
   正在使用 deepResearch 进行深度研究（可能需要几分钟）...
```

**用户体验**：
- 清晰的进度反馈（5 个阶段）
- 预期时间提示（如"可能需要几分钟"）
- 实时工具调用显示

---

**2. 中途停止研究**

如果研究方向不符合预期，用户可以随时停止：

```
用户："停止研究"

AI 回复：
"✅ 研究已停止。

当前已完成：
• 阶段 1：主题理解（已完成）
• 阶段 2：播客规划（已完成）
• 阶段 3：深度研究（进行中，已停止）

如需重新开始，请提出新的研究需求。"
```

---

**3. 请求额外输出**

播客生成后，用户可以请求额外的报告：

```
用户："能再生成一份报告吗？我想看具体的数据和趋势图表。"

AI 调用 generateReport:
  instruction: "生成信息密度高的快速阅读报告，包含数据图表和趋势分析"

AI 回复：
"✅ 研究报告已生成！

📊 **查看报告**：[报告查看链接]

报告包含：
• 10+ 数据图表
• 5大核心趋势分析
• 3个真实案例深度解读
• 实战建议清单

报告采用快速阅读格式，5-10分钟即可掌握核心要点。"
```

---

### 三、输出优化

**1. 播客脚本结构**

Fast Insight Agent 生成的播客脚本遵循固定结构：

```markdown
# [播客标题]

## 开场（1-2 分钟）
- Hook：吸引听众的开场（如数据、案例、问题）
- 主题介绍：今天要讨论什么
- 为什么重要：为什么听众应该关心

## 核心内容（10-12 分钟）
### 观点 1：[核心观点标题]
- 数据支撑
- 案例故事
- 趋势分析

### 观点 2：[核心观点标题]
- 数据支撑
- 案例故事
- 趋势分析

### 观点 3：[核心观点标题]
- 数据支撑
- 案例故事
- 趋势分析

## 结尾（2-3 分钟）
- 总结：3 大核心要点
- 实战启示：听众可以做什么
- Call to Action：引导反馈或下一步行动
```

**特点**：
- 结构化对话（非访谈形式）
- 数据 + 案例 + 趋势分析
- 15-20 分钟时长（适合通勤场景）

---

**2. 播客音频质量**

Fast Insight Agent 使用高质量 TTS 服务生成音频：

**技术规格**：
- **采样率**：24kHz
- **格式**：MP3
- **语言**：支持中文、英文
- **语速**：1.0x（可调节）
- **音色**：专业播客主持人音色

**未来改进**：
- 支持多语言播客（如中英双语）
- 支持自定义音色和语调
- 支持章节标记（便于跳转）

---

**3. 可选报告格式**

如果用户请求生成报告，Fast Insight Agent 会生成 `fastInsight` 风格的报告：

**报告特点**：
- **信息密度高**：重点展示数据、图表、趋势
- **快速阅读**：5-10 分钟即可掌握核心要点
- **Markdown 格式**：支持导出为 PDF、Word
- **补充播客**：报告提供播客中未详细展开的数据和分析

**报告结构**：
```markdown
# [研究主题]

## 执行摘要（Executive Summary）
- 核心发现（3-5 条）
- 关键数据（3-5 个指标）
- 实战建议（3-5 点）

## 详细分析
### 趋势 1：[趋势标题]
- 数据图表
- 案例深度解读
- 影响分析

### 趋势 2：[趋势标题]
- 数据图表
- 案例深度解读
- 影响分析

## 数据附录
- 数据表格
- 信息来源
- 方法说明
```

---

## 竞品对比

### Fast Insight Agent vs Listen Labs

| **维度** | **Fast Insight Agent** | **Listen Labs** |
|---------|------------------------|-----------------|
| **主要输出** | 播客音频 + 脚本 + 可选报告 | 访谈音频 + 文字稿 |
| **研究方法** | deepResearch（多源信息聚合） | 一对一访谈（AI Persona） |
| **执行速度** | 5-10 分钟 | 需要手动设计访谈问题 |
| **AI Persona** | 不使用 | 用户自建 Persona |
| **内容质量** | 高（多源验证 + AI 推理） | 依赖 Persona 质量 |
| **适用场景** | 时事分析、行业洞察、内容营销 | 用户痛点研究、产品决策 |
| **播客类型** | 结构化对话（观点导向） | 访谈对话（问答形式） |

**核心差异**：
- **Fast Insight**：**播客优先**，快速生成高质量内容，适合时事和行业洞察
- **Listen Labs**：**访谈优先**，深度理解用户，适合产品和用户研究

---

### Fast Insight Agent vs NotebookLM

| **维度** | **Fast Insight Agent** | **NotebookLM** |
|---------|------------------------|---------------|
| **主要输出** | 播客音频 + 脚本 + 可选报告 | 播客音频（双人对话） |
| **研究能力** | ✅ 自主研究（webSearch + deepResearch） | ❌ 仅基于用户上传的文件 |
| **数据来源** | 网络 + 社交媒体 + 文件附件 | 仅用户上传的文件 |
| **播客类型** | 结构化对话（观点导向） | 双人访谈对话 |
| **可定制性** | 高（可指定关注重点、受众） | 低（自动生成，无法干预） |
| **报告生成** | ✅ 支持（可选） | ❌ 不支持 |
| **适用场景** | 时事分析、行业洞察、快速学习 | 文件总结、知识梳理 |

**核心差异**：
- **Fast Insight**：**自主研究**，主动收集最新信息，适合时效性强的话题
- **NotebookLM**：**被动总结**，仅基于用户提供的文件，适合知识梳理

---

### Fast Insight Agent vs Perplexity

| **维度** | **Fast Insight Agent** | **Perplexity** |
|---------|------------------------|---------------|
| **主要输出** | 播客音频 + 脚本 + 可选报告 | 文字回答 + 引用来源 |
| **内容形式** | 音频（15-20 分钟） | 文字（1000-2000 字） |
| **研究深度** | 深（多源聚合 + AI 推理 + 播客规划） | 中（搜索 + 简单总结） |
| **适用场景** | 通勤、运动、做家务时学习 | 快速查找信息 |
| **交互方式** | 单次研究（5-10 分钟生成播客） | 多轮对话（即时回答） |
| **报告生成** | ✅ 支持（高信息密度） | ❌ 不支持 |

**核心差异**：
- **Fast Insight**：**播客优先**，15-20 分钟结构化音频，适合深度学习
- **Perplexity**：**文字优先**，即时回答，适合快速查找信息

---

## FAQ

### 1. Fast Insight Agent 和 Study Agent 有什么区别？

**核心区别**：
- **Fast Insight**：播客驱动，快速生成音频内容（5-10 分钟）
- **Study Agent**：报告驱动，深度商业研究（15-30 分钟）

**详细对比**：

| **维度** | **Fast Insight** | **Study Agent** |
|---------|------------------|-----------------|
| **主要输出** | 播客音频 + 脚本 | 研究报告 |
| **研究方法** | deepResearch（多源信息聚合） | interviewChat + discussionChat + scoutTaskChat |
| **AI Persona** | 不使用 | 大量使用（Tier 1-3） |
| **最大步数** | 10 步 | 20+ 步 |
| **工具数量** | 7 个 | 20+ 个 |
| **适用场景** | 时事分析、内容营销 | 产品决策、用户研究 |

**选择建议**：
- **需要播客吗？** → 是 → Fast Insight
- **需要深度理解"为什么"吗？** → 是 → Study Agent

---

### 2. Fast Insight Agent 支持哪些语言？

**播客生成**：
- ✅ 中文（zh-CN）
- ✅ 英文（en-US）
- ❌ 其他语言（未来支持）

**内容研究**：
- ✅ 支持全球信息源（通过 webSearch + deepResearch）
- ✅ 自动翻译和整合多语言内容

**未来计划**：
- 支持中英双语播客（如中文播客 + 英文摘要）
- 支持更多语言（日语、韩语、西班牙语等）

---

### 3. 播客音频质量如何？

**技术规格**：
- **TTS 服务**：高质量语音合成
- **采样率**：24kHz
- **格式**：MP3
- **音色**：专业播客主持人音色
- **语速**：1.0x（可调节）

**用户反馈**：
- ✅ 声音自然流畅（用户满意度 85%+）
- ✅ 中文发音准确（支持多音字、语气词）
- ⚠️ 英文发音略显机械（未来改进）

**未来改进**：
- 支持自定义音色（如男声、女声、不同风格）
- 支持情感控制（如兴奋、严肃、轻松）
- 支持多人对话（如双人播客）

---

### 4. 能生成多长时间的播客？

**默认时长**：15-20 分钟

**时长控制**：
- 用户可以在请求中指定时长（如"生成一个 10 分钟的播客"）
- AI 会根据研究深度自动调整时长

**时长限制**：
- **最短**：10 分钟（过短会缺乏深度）
- **最长**：30 分钟（过长会超出 maxSteps 限制）

**未来支持**：
- 播客系列生成（如 3 集播客，每集 15 分钟）
- 章节标记（便于跳转到感兴趣的部分）

---

### 5. 播客和报告的区别是什么？

**播客**（主要输出）：
- **形式**：音频 + 脚本
- **时长**：15-20 分钟
- **风格**：结构化对话（观点导向）
- **适用场景**：通勤、运动、做家务时学习

**报告**（可选输出）：
- **形式**：Markdown 文档
- **长度**：5000-8000 字
- **风格**：高信息密度（数据 + 图表 + 趋势分析）
- **适用场景**：需要详细数据和深度分析时

**互补关系**：
- 播客：快速获取核心观点和趋势
- 报告：深入了解数据和案例细节

---

### 6. 能否重新生成播客？

**支持重新生成**：

用户可以请求重新生成播客，AI 会：
1. 保留原有研究结果（studyLog）
2. 重新调用 `generatePodcast` 工具
3. 生成新的 `podcastToken` 和音频

**场景示例**：
```
用户："能重新生成一个播客吗？这次重点关注数据部分。"

AI 调用 generatePodcast:
  instruction: "重点展示数据和趋势图表"

AI 回复：
"✅ 新播客已生成！

🎧 **收听新播客**：[新播客播放器链接]

这次的播客更加聚焦数据和趋势分析，包含：
• 10+ 核心数据点
• 5 张趋势图表解读
• 数据背后的洞察

原播客仍然保留：[原播客链接]"
```

---

### 7. Fast Insight Agent 的成本如何？

**Token 消耗**（单次研究）：

| **阶段** | **工具** | **Token 消耗** |
|---------|---------|--------------|
| 主题理解 | webSearch | ~2K tokens |
| 播客规划 | planPodcast | ~5K tokens |
| 深度研究 | deepResearch | ~15K tokens |
| 播客生成 | generatePodcast | ~20K tokens |
| **总计** | - | **~42K tokens** |

**可选报告**：
- generateReport: ~10K tokens

**总成本估算**：
- 播客生成：~42K tokens（约 $0.20 USD）
- 播客 + 报告：~52K tokens（约 $0.25 USD）

**vs 常规研究**：
- Study Agent（含访谈）：~150K tokens（约 $0.75 USD）

**成本优势**：
- Fast Insight Agent 比 Study Agent 便宜 70%+
- 适合高频内容生成（如每日播客）

---

### 8. 如何触发 Fast Insight Agent？

**触发条件**（满足任一即可）：
1. 明确要求"播客"/"音频内容"/"可听的内容"
2. 明确要求"快速洞察"/"fast insight"
3. 时效性极强的话题（如突发新闻、热点事件）
4. 用户提到"通勤时听"/"做家务时听"等场景

**示例输入**：
```
✅ "我想了解 2025 年 AI 趋势，能帮我生成一个播客吗？"
✅ "能给我一个关于 OpenAI 发布会的快速洞察吗？我在开车。"
✅ "帮我分析一下这个热点话题，最好是音频形式。"
```

**不触发条件**：
```
❌ "我想了解用户为什么选择这个产品"（需要深度访谈 → Study Agent）
❌ "帮我分析一下这个产品的市场机会"（需要多阶段研究 → Study Agent）
```

---

## 总结

Fast Insight Agent 是 atypica.AI 的**播客驱动快速洞察研究智能体**，专注于将时事和商业洞察转化为高质量的音频内容。

### 核心优势

**1. 速度与质量兼顾**
- 5-10 分钟完成研究和播客生成
- 多源信息聚合（网络 + 社交媒体 + AI 推理）
- 15-20 分钟结构化播客音频

**2. 严格工作流，确保质量**
- 5 阶段线性流程（主题理解 → 播客规划 → 深度研究 → 播客生成 → 研究结束）
- 每个阶段有明确的验证检查点
- AI 无法跳过任何必需步骤

**3. 播客优先，报告可选**
- 主要输出：播客音频 + 脚本
- 可选输出：高信息密度的快速阅读报告
- 适合通勤、运动、做家务时学习

**4. 成本优势**
- 比 Study Agent 便宜 70%+（~42K tokens vs ~150K tokens）
- 适合高频内容生成（如每日播客）

### 适用场景

✅ **适合**：
- 热点话题快速分析（如突发新闻、财报发布）
- 行业洞察播客（如消费趋势、技术趋势）
- 快速知识学习（如新技术科普、行业入门）
- 内容营销（如公司博客、KOL 合作）

❌ **不适合**：
- 产品决策研究（需要深度用户访谈）
- 用户痛点研究（需要 AI Persona 模拟）
- 市场机会发现（需要社交媒体深度观察）
- 品牌定位研究（需要大规模样本）

### 与其他 Agent 的关系

**三层架构**：
```
Plan Mode（意图澄清层）
    ↓
┌───────────────┬────────────────┬──────────────────┐
│ Fast Insight  │  Study Agent   │ Product R&D Agent│
│ (播客驱动)    │  (报告驱动)    │  (产品驱动)      │
└───────────────┴────────────────┴──────────────────┘
         ↓
    执行层（5-6 阶段严格流程）
```

**选择逻辑**：
1. **需要播客吗？** → 是 → Fast Insight Agent
2. **需要深度理解"为什么"吗？** → 是 → Study Agent
3. **需要产品创新机会吗？** → 是 → Product R&D Agent

### 未来展望

**近期改进**（3 个月内）：
- 支持中英双语播客
- 支持自定义音色和语调
- 支持章节标记（便于跳转）

**中期改进**（6 个月内）：
- 支持播客系列生成（多集播客）
- 支持多人对话播客（如双人访谈）
- 增强音频质量和自然度

**长期愿景**（12 个月内）：
- 支持视频播客生成（音频 + 动画）
- 支持实时播客生成（如直播场景）
- 支持多语言播客（日语、韩语、西班牙语等）

---

**相关文档**：
- [Plan Mode 价值说明](./plan-mode.md) - 了解如何触发 Fast Insight Agent
- [Memory System 机制](./memory-system.md) - 了解 AI 如何记住你的偏好
- [atypica vs Listen Labs](../competitors/atypica-vs-listen-labs.md) - 竞品对比
- [atypica vs 传统调研公司](../competitors/atypica-vs-traditional-research.md) - 行业对比
