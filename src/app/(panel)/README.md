# Discussion / 讨论

讨论核心实现模块，负责多 persona 群聊的完整流程。

## 快速导航

### 核心入口

**`lib/orchestration.ts` - `runPersonaDiscussion()`**

这是发起讨论的主入口函数：

```typescript
import { runPersonaDiscussion } from "@/app/(panel)/lib";

const { timelineEvents, summary } = await runPersonaDiscussion({
  userId: number,
  maxRounds?: number,            // 最大讨论轮数（默认20轮）
  instruction: string,           // 用户指令（问题 + 讨论风格要求）
  personaIds: number[],          // 参与者 ID 列表
  timelineToken: string,
  locale: Locale,
  abortSignal?: AbortSignal,
  logger: Logger,
});
```

**调用方**：
- `src/ai/tools/experts/discussionChat/` - AI 工具调用（主要入口）
- `src/app/admin/panel/` - 管理后台测试

### 讨论类型系统

详见：[discussionTypes/README.md](./discussionTypes/README.md)

讨论类型定义了主持人的控场方式，包括：
- 预设类型：焦点小组、辩论、圆桌
- 动态生成：根据用户指令自动生成讨论风格

---

## 代码结构 Walkthrough

### `lib/` - 核心业务逻辑

#### `orchestration.ts` - 主流程 (272 行)

**入口函数**: `runPersonaDiscussion()`

**流程**:
```
1. buildDiscussionType(instruction)     → 动态生成讨论类型配置
2. savePersonaPanel(userId, personaIds) → 保存 PersonaPanel
3. initializeDiscussionTimeline()       → 加载 personas，初始化 timeline
4. 循环 maxRounds 轮（默认20轮）:
   - selectNextSpeakerModerator()       → 主持人选择下个发言者
   - generatePersonaReply()             → Persona 生成回复
   - saveTimelineEvent()                → 实时保存到数据库
5. generateSummaryAndMinutes()          → 并行生成总结和纪要
6. saveTimelineEvent(final)             → 保存最终结果
```

**关键点**:
- 每轮更新都立即保存数据库（实时持久化）
- 主持人控制发言顺序和问题方向
- 默认 20 轮讨论（可通过 maxRounds 参数调整）
- 确保所有 persona 至少发言一次

---

#### `speaker-selection.ts` - 发言者选择 (140 行)

**核心函数**: `selectNextSpeakerModerator()`

**策略**: 主持人使用 LLM 分析时间线，决定：
- 谁下一个发言（`selectedPersonaId`）
- 问什么问题（`nextQuestion`）
- 为什么选他（`reasoning`）

**工具调用**:
```typescript
const selectSpeakerTool = tool({
  inputSchema: z.object({
    selectedPersonaId: z.number(),
    nextQuestion: z.string(),
    reasoning: z.string().optional(),
  }),
  execute: async (args) => args,
});
```

**备用策略**: `selectNextSpeakerRandom()` - 简单轮流

---

#### `generation.ts` - LLM 生成 (127 行)

**3 个生成函数**:

1. **`generatePersonaReply()`**
   - 输入: persona session + 格式化时间线 + 主持人问题
   - 输出: persona 的回复内容
   - 模型: 根据 persona 配置选择

2. **`generateSummaryAndMinutes()`** - 并行生成总结和纪要
   - 内部调用 `generateModeratorSummary()`: 主持人视角的总结
     * 面向研究目标，提炼关键洞察
   - 内部调用 `generateDiscussionMinutes()`: 结构化纪要
     * 使用 `prompt/minutes.ts` 的 system prompt
     * 无损记录：按时间顺序记录所有发言
     * 保留具体细节（产品名、品牌名等）
     * 记录参与者互动关系（同意/反对）

---

#### `formatting.ts` - 时间线格式化 (69 行)

**目的**: 不同角色看到不同的时间线

**2 个函数**:

1. **`formatTimelineForPersona()`**
   - Persona 视角：只看主持人的问题，看不到初始用户问题
   - 过滤掉 `author: "user"` 的问题

2. **`formatTimelineForModerator()`**
   - 主持人视角：看完整时间线
   - 包含所有问题和回复

---

#### `persistence.ts` - 数据库操作 (69 行)

**2 个函数**:

1. **`saveTimelineEvent()`**
   - 实时更新 `DiscussionTimeline` 记录
   - 保存 events、summary、minutes

2. **`savePersonaPanel()`**
   - 创建或更新 `PersonaPanel` 配置
   - 存储 personaIds 和 moderatorSystem

---

#### `index.ts` - 导出入口

统一导出所有公共函数。
