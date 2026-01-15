# Memory System 机制

**一句话总结**：持久化记忆系统，让 AI 记住用户背景、偏好和研究历史，无需重复沟通，理解越来越深入。

---

## 核心对比：有记忆 vs 无记忆

| 维度 | 有 Memory 系统 | 无记忆（传统方式） |
|------|--------------|-----------------|
| **用户体验** | "你之前研究过的 Olay 逻辑..." | "能再说一遍你的需求吗？" |
| **信息保持** | 跨会话持久化（永久） | 仅在单次对话内（临时） |
| **重复沟通** | 零重复，AI 主动应用偏好 | 每次都要重新说明 |
| **个性化程度** | 越用越懂，深度个性化 | 每次都是陌生人 |
| **记忆范围** | 用户级 + 团队级 | 无（或手动复制粘贴） |
| **存储内容** | Profile, Preference, ResearchHistory, RecurringTheme, UnexploredInterest | N/A |
| **更新机制** | 研究完成后自动提取 | 无自动更新 |
| **容量管理** | 自动重组和压缩（8000 tokens 阈值） | N/A |
| **版本追溯** | 支持版本历史 | 无历史 |
| **团队共享** | 支持团队级记忆共享 | 无法共享 |

---

## 核心概念

### 1. 双层架构：Core + Working

```typescript
// src/prisma/schema.prisma:770-771
core    String @default("") @db.Text    // 核心记忆 (Markdown)
working Json   @default("[]")           // 工作记忆 (待整合知识)
```

- **Core Memory（核心记忆）**：Markdown 格式，精炼的持久化信息，类似大脑长期记忆
- **Working Memory（工作记忆）**：JSON 格式，临时待整合的知识，类似大脑短期记忆

### 2. 用户级 + 团队级

```typescript
// src/prisma/schema.prisma:763-767
userId  Int?
user    User? @relation("UserMemory", ...)
teamId  Int?
team    Team? @relation("TeamMemory", ...)
version Int
```

- **用户级记忆**：个人偏好、研究历史，仅该用户可见
- **团队级记忆**：团队共享的知识和偏好，所有成员共享
- **互斥性**：一条记忆要么属于用户，要么属于团队（不能同时）

### 3. 版本管理

每次更新或重组都会创建新版本：
- `version` 字段自动递增
- `changeNotes` 记录变更说明（"Initial memory created", "Reorganized memory from 12000 to 6500 characters", "Updated: added new information from conversation"）
- 支持历史追溯（`orderBy: { version: "desc" }`）

---

## 5 大提取类别

Memory System 只提取对 **未来任务有效性和效率有帮助** 的信息。

### 1. [Profile] - 基本信息

**定义**：用户的基本信息（姓名、角色、地点、背景）

**提取标准**：**仅提取明确声明的事实**，不推断

✅ **应该提取**：
- "我叫 Sarah" → `- [Profile] Name: Sarah`
- "我在 Google 做产品经理" → `- [Profile] Works as product manager at Google`
- "我们团队在法国和中国之间运营" → `- [Profile] Operates between China and France`

❌ **不应该提取**：
- 从上下文推断角色（未明确说明）
- 临时位置（"这次我在北京出差"）

### 2. [Preference] - 工作偏好

**定义**：帮助未来交互效率和效果的信息（工具偏好、沟通风格、工作习惯）

**提取标准**：**持久性偏好**，而非一次性尝试

✅ **应该提取**：
- "我总是喜欢先评估再建议" → `- [Preference] Prefers comprehensive assessment before actionable recommendations`
- "我需要数据支撑的分析" → `- [Preference] Values data-backed analysis with evidence`
- "我习惯从 Z 世代角度切入" → `- [Preference] Consistently analyzes from Gen-Z perspective`

❌ **不应该提取**：
- "这次试试数据驱动的方法" （一次性实验）
- "这个项目用定性分析" （项目特定，非持久偏好）

### 3. [ResearchHistory] - 研究历史索引

**定义**：过往重要研究的简短索引（项目名 + 主题 + 核心洞察，一行）

**提取标准**：**仅在完成重要研究后提取**，不存储详细内容

✅ **应该提取**：
- `- [ResearchHistory] Olay skincare Z-gen research - emotional triggers > price sensitivity`
- `- [ResearchHistory] ByteDance gaming Gen-Z study - community matters more than graphics`
- `- [ResearchHistory] Nike sportswear Gen-Z study - authenticity matters most`

❌ **不应该提取**：
- 进行中的探索（未完成）
- 初步问题（无结论）
- 详细研究内容（应存在数据库，不在 memory）

**关键格式**：
```
项目/客户名（可选）+ 主题 - 核心洞察
```

**重要规则**：不写时间描述（"3 months ago", "recently"）！记忆是静态的，让条目顺序和项目名提供隐式时间上下文。

### 4. [RecurringTheme] - 持续兴趣模式

**定义**：用户在多次对话中重复出现的兴趣或关注点

**提取标准**：**同一主题出现 2+ 次才提取**

✅ **应该提取**：
- 用户完成了 Olay、ByteDance、Nike 三个 Z 世代研究 → `- [RecurringTheme] Consistently interested in Z-generation consumer behavior across categories`
- 多次提到可持续性 → `- [RecurringTheme] Persistent focus on sustainability and ethical consumption patterns`

❌ **不应该提取**：
- 单次提及或随口说说
- 临时兴趣（无重复）

### 5. [UnexploredInterest] - 未探索兴趣

**定义**：用户表达了兴趣但还未尝试的想法、工具或方法

**提取标准**：明确的意图表达（"想试试", "感兴趣", "应该探索", "也许下次"）

✅ **应该提取**：
- "我一直想试试 AI 视频生成工具，但还没时间" → `- [UnexploredInterest] Mentioned wanting to try AI video generation (Runway/Kling) but hasn't implemented yet`
- "对 TikTok 营销感兴趣，但现在专注 Instagram" → `- [UnexploredInterest] Interested in exploring TikTok marketing but focused on Instagram for now`

❌ **不应该提取**：
- "这个有意思" （随口好奇）
- "也许值得看看" （无明确意图）

**价值**：让 AI 在完美时机主动提醒："你之前说想试 X，这次正好可以用上！"

---

## 自动重组机制

### 触发条件

```typescript
// src/app/(memory)/lib/utils.ts:2
const MEMORY_THRESHOLD = 8000;

export function countMemoryLength(memory: string): number {
  // 模拟 LLM token 计数
  return memory.split(/[\s.,!?;:"'(){}\[\]-]+/).filter(token => token.length > 0).length;
}
```

当 memory 长度超过 **8000 tokens** 时，自动触发重组。

### 重组流程

1. **清理低质量提取**
   - 删除不符合提取标准的信息（非持久、非可操作、错误类别）
   - 删除临时状态、一次性请求、任务特定细节
   - 删除冗余和模糊信息

2. **合并和重组**
   - 合并重复或相关的事实
   - 按类别分组（[Profile] 和 [Preference]）
   - 删除重复信息
   - 如果新信息与旧信息冲突，保留最新的
   - 简化冗长描述，保留核心含义

3. **创建新版本**
   ```typescript
   // src/app/(memory)/lib/updateMemory.ts:59-69
   const newVersion = currentVersion + 1;
   await prisma.memory.create({
     data: {
       userId: userId ?? null,
       teamId: teamId ?? null,
       version: newVersion,
       core: reorganizedContent,
       working: [],
       changeNotes: `Reorganized memory from ${currentContent.length} to ${reorganizedContent.length} characters`,
       extra: {},
     },
   });
   ```

### 重组示例

**重组前**（冗长、冗余）：
```markdown
- [Profile] Works in private equity/investment fund branding and strategy
- [Profile] Based in France or operates between China and France; interested in cross-border commerce
- [Preference] Needs deep customer persona research, insights, and brand value validation
- [Preference] Target client range: $100K to $20M investable USD assets (potentially two segments)
- [Preference] Product 1: Beta-level investment projects - rare opportunities through founder networks
- [Preference] Prefers comprehensive assessment before recommendations; wants positioning phase first
- [Preference] Customer persona and deep insights for Chinese USD investors
```

**重组后**（精简、去重）：
```markdown
- [Profile] Works in private equity/investment fund branding and strategy
- [Profile] Based in France or operates between China and France; interested in cross-border commerce
- [Preference] Prefers comprehensive, in-depth professional assessment before actionable recommendations; wants to focus on positioning and evaluation phase first for research requests
```

**效果**：从 7 条压缩到 3 条，保留核心信息，删除项目特定细节。

---

## 记忆更新流程

### 1. 自动触发时机

```typescript
// src/app/(study)/agents/studyLog/index.ts:53-61
waitUntil(
  updateMemory({
    userId,
    conversationContext: [
      ...filteredUserMessages,
      {
        role: "assistant",
        content: [
          { type: "text", text: "Study Log Generated" },
          { type: "text", text: studyLog },
        ],
      },
    ],
    logger,
  }),
);
```

**触发时机**：研究完成后，生成 studyLog 时自动触发。

### 2. 更新流程（Two-Step）

```typescript
// src/app/(memory)/lib/updateMemory.ts:22-128
export async function updateMemory({
  userId, teamId, conversationContext, logger
}): Promise<void> {
  // Step 1: Reorganize if threshold exceeded
  if (isMemoryThresholdMet(currentContent, logger)) {
    const reorganizedContent = await reorganizeMemoryContent(currentContent, logger);
    // Create new version with reorganized content
  }

  // Step 2: Always update with new information
  const updatedContent = await updateMemoryContent(currentContent, conversationContext, logger);
  // Update or create memory record
}
```

#### Step 1: 检查是否需要重组
- 如果超过 8000 tokens → 重组并创建新版本
- 使用 `claude-sonnet-4-5` 模型

#### Step 2: 提取新信息
- 使用 `claude-haiku-4-5` 模型（快速、低成本）
- 调用 Memory Update Agent，最多 5 步（`stopWhen: stepCountIs(5)`）
- Agent 可以多次调用 `memoryUpdate` tool（例如提取 3 条信息就调用 3 次）

### 3. Memory Update Agent

```typescript
// src/app/(memory)/prompt/memoryUpdate.ts:1-155
export const memoryUpdateSystemPrompt = `
You are a memory extraction agent. Your job is to identify and extract information
from conversations that should be remembered for future interactions.

Memory serves as a navigation index - not full storage, but signposts that help
connect dots across conversations.

**Important**: You can call the memoryUpdate tool multiple times in a single
extraction session. If you identify several pieces of information worth remembering,
make separate tool calls for each one.
...
`;
```

**核心职责**：
- 从对话中提取值得记住的信息
- 按 5 大类别分类（Profile, Preference, ResearchHistory, RecurringTheme, UnexploredInterest）
- 每发现一条信息，调用一次 `memoryUpdate` tool
- 如果无值得记住的信息，调用 `memoryNoUpdate` tool

**Tool 接口**：
```typescript
// src/app/(memory)/tools/memoryUpdate/index.ts:17-33
memoryUpdateTool = tool({
  description: "Insert new content into memory at a specific line index",
  inputSchema: z.object({
    lineIndex: z.number().describe("Line index to insert (-1 for append)"),
    newLine: z.string().describe("New line content to insert"),
  }),
  execute: async ({ lineIndex, newLine }) => {
    // Tool only records LLM's decision
    // Actual database operations in updateMemory function
    return { plainText: `Memory update instruction recorded: insert at line ${lineIndex === -1 ? "end" : lineIndex + 1}` };
  },
});
```

**设计哲学**：
- Tool 本身不执行数据库操作（Pure function）
- 只记录 LLM 的决策（lineIndex + newLine）
- 实际更新由 `updateMemory` 函数批量执行

### 4. 应用记忆更新

```typescript
// src/app/(memory)/lib/updateMemory.ts:267-293
function applyMemoryUpdate(currentContent: string, lineIndex: number, newLine: string): string {
  if (currentContent.length === 0) {
    return newLine; // Empty memory: just set to newLine
  }

  const lines = currentContent.split("\n");

  if (lineIndex === -1) {
    lines.push(newLine); // Append at end
  } else {
    lines.splice(lineIndex + 1, 0, newLine); // Insert after specified line
  }

  return lines.join("\n");
}
```

**更新方式**：
- `lineIndex: -1` → 追加到末尾（最常用）
- `lineIndex: N` → 插入到第 N 行之后

---

## 记忆使用方式

### 1. 加载时机

```typescript
// src/app/(study)/agents/baseAgentRequest.ts:321-328
// Phase 6: Update and Load User Memories
const userMemory = await loadUserMemory(userId);
if (userMemory) {
  const text = buildMemoryUsagePrompt({ userMemory, locale });
  modelMessages = [{ role: "user", content: [{ type: "text", text }] }, ...modelMessages];
}
```

**关键点**：
- 在 Phase 6 加载（在 reference study 之后，streamText 之前）
- 注入为 **user message**（不是 system prompt）
- 置于消息流最前面

### 2. Memory Usage Prompt

```typescript
// src/app/(memory)/prompt/memoryUsage.ts:9-64 (zh-CN)
export const buildMemoryUsagePrompt = ({ userMemory, locale }) => `
<UserMemory>
${userMemory}
</UserMemory>

## 如何使用用户记忆

你现在了解这位用户的背景、偏好和研究历史。请这样运用：

### 1. 主动关联历史研究
- 当用户提出新问题时，检查 [ResearchHistory] 是否有相关过往研究
- 如果有，直接说："你之前研究过类似的X，当时发现了Y，这次可以..."
- 不要问"还记得吗"，直接引用并延续

### 2. 自动应用偏好
- [Preference] 中的工作方式直接执行，不要每次确认
- 例如：用户偏好"先评估再建议" → 自动按这个结构输出

### 3. 识别持续兴趣
- [RecurringTheme] 显示用户的研究模式和持续关注点
- 在相关话题上主动深入，展现你理解他们的研究方向

### 4. 保持自然
- 像老朋友一样引用记忆，不要说"根据记忆显示..."
- 好的方式："继续上次的思路..."、"基于你的偏好..."
- 只在真正有价值时引用，否则正常对话

**禁止说的话**（Never say）:
- ❌ "我记得你说过..." / "I remember you said..."
- ❌ "根据我的记忆..." / "According to my memory..."

**应该说的话**（Should say）:
- ✅ "你之前研究过..." / "You researched..."
- ✅ "基于你的偏好..." / "Based on your preference..."

### 5. 在完美时机提出未探索兴趣
- [UnexploredInterest] 记录了用户感兴趣但还未尝试的想法和工具
- 当相关场景出现时，主动提醒："上次你说想试X，这次正好可以..."

**重要**：记忆是工具，不是表演。用它提升效率和个性化，但不要刻意炫耀"我记得"。
`;
```

**核心原则**：
1. **主动关联**：自动引用历史研究，不问"还记得吗"
2. **自动应用**：直接执行偏好，不重复确认
3. **识别模式**：理解持续兴趣，主动深入
4. **保持自然**：像老朋友，不炫耀记忆
5. **完美时机**：在合适场景提出未探索兴趣

---

## 技术实现细节

### 数据库 Schema

```typescript
// prisma/schema.prisma:761-777
model Memory {
  id      Int   @id @default(autoincrement())
  userId  Int?
  user    User? @relation("UserMemory", fields: [userId], references: [id], onDelete: Cascade)
  teamId  Int?
  team    Team? @relation("TeamMemory", fields: [teamId], references: [id], onDelete: Cascade)
  version Int

  core    String @default("") @db.Text // 核心记忆 (Markdown)
  working Json   @default("[]")        // 工作记忆 (来自对话的待整合知识)

  changeNotes String @db.Text
  extra       Json   @default("{}")

  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @db.Timestamptz(6)

  @@unique([userId, version])  // 或 @@unique([teamId, version])
  @@index([userId, version(sort: Desc)])  // 优化查询最新版本
}
```

**关键索引**：
- `@@unique([userId, version])` - 保证每个用户的版本唯一
- `@@index([userId, version(sort: Desc)])` - 优化"获取最新版本"查询

### 加载函数

```typescript
// src/app/(memory)/lib/loadMemory.ts:8-16
export async function loadUserMemory(userId: number): Promise<string> {
  const memory = await prisma.memory.findFirst({
    where: { userId },
    select: { core: true },
    orderBy: { version: "desc" },
    take: 1,
  });

  return memory?.core ?? "";
}
```

**查询策略**：
- 按 `version DESC` 排序
- 只取第 1 条（最新版本）
- 只返回 `core` 字段（Markdown 内容）

### 使用的 AI 模型

| 操作 | 模型 | 原因 |
|------|------|------|
| **Memory Update**（提取） | `claude-haiku-4-5` | 快速、低成本，任务简单（分类和提取） |
| **Memory Reorganize**（重组） | `claude-sonnet-4-5` | 高级推理，需要判断和压缩 |

```typescript
// src/app/(memory)/lib/updateMemory.ts:14-15
const MEMORY_UPDATE_MODEL: LLMModelName = "claude-haiku-4-5";
const MEMORY_REORGANIZE_MODEL: LLMModelName = "claude-sonnet-4-5";
```

### Token 计数和阈值

```typescript
// src/app/(memory)/lib/utils.ts:2-11
const MEMORY_THRESHOLD = 8000;

export function countMemoryLength(memory: string): number {
  // 模拟 LLM token 计数：按空格和标点分割
  return memory.split(/[\s.,!?;:"'(){}\[\]-]+/).filter(token => token.length > 0).length;
}
```

**近似方法**：
- 按空格和标点分割字符串
- 过滤空字符串
- 计数单词/标记数量
- **不精确**，但足够判断是否超阈值

---

## 实际案例：私募基金品牌研究

### 用户初次请求

```
研究一个私募基金的品牌机会，面向的是中国市场的手上有美元，感兴趣美元投资的客户
（从手上10万可投资美元，到2000万可投资美元，这个范围比较大，或许可以分为两类？），
销售的产品是beta level的投资项目，我们追求的品牌价值定位是价值捕手，极为专业，
know when buy when sell，同时核心的两位创始人的优质的巧妙的人脉关系和专业资源，
使得品牌能给客户提供非常难得的、恰好的、物有所值的，通常难以access但却能通过拼盘实现的买入购入。
```

### Memory Update Agent 提取

**第一次 tool call**:
```json
{
  "lineIndex": -1,
  "newLine": "- [Profile] Works in private equity/investment fund branding and strategy"
}
```

**第二次 tool call**:
```json
{
  "lineIndex": -1,
  "newLine": "- [Preference] Prefers comprehensive, in-depth professional assessment before actionable recommendations; wants to focus on positioning and evaluation phase first"
}
```

### 研究完成后的 Memory

```markdown
- [Profile] Works in private equity/investment fund branding and strategy
- [Profile] Based in France or operates between China and France; interested in cross-border commerce between China and Europe
- [Preference] Prefers comprehensive, in-depth professional assessment before actionable recommendations; wants to focus on positioning and evaluation phase first for research requests
```

### 下次对话自动应用

**用户说**："帮我研究一下跨境电商的品牌策略"

**AI（自动应用记忆，无需确认）**：
> 基于你的偏好，我会先进行深度的市场评估和定位分析，再提供可执行的建议。让我们先从以下几个维度评估跨境电商品牌的核心价值主张：
>
> 1. **目标客户画像和深度洞察**...
> 2. **品牌价值定位和差异化**...
> 3. **触媒习惯和内容策略**...

**关键点**：
- AI 自动采用"先评估后建议"的结构
- 无需用户重复说明工作方式
- 不说"我记得你说过"，直接执行

---

## 10 个常见问题

### 1. Memory System 和对话历史有什么区别？

| 维度 | Memory System | 对话历史 (Chat History) |
|------|--------------|----------------------|
| **生命周期** | 跨会话持久化（永久） | 单次对话内（临时） |
| **存储内容** | 精炼的导航索引（Profile, Preference, 研究历史） | 完整的用户消息和 AI 回复 |
| **更新方式** | LLM 智能提取和重组 | 简单追加消息 |
| **容量管理** | 自动重组压缩（8000 tokens 阈值） | 通常有长度限制（context window） |
| **使用方式** | 作为 context 注入到新对话 | 直接发送给 LLM |

**类比**：
- **Memory**：你的笔记本，记录关键信息和洞察
- **Chat History**：录音带，记录完整对话内容

### 2. 什么时候触发 Memory 更新？

**自动触发**：
- 研究完成后（生成 studyLog 时）
- 位置：`src/app/(study)/agents/studyLog/index.ts:53`

**不触发的情况**：
- 普通对话中（无研究完成）
- 用户仅浏览内容（无交互）

**设计原因**：Memory 更新需要调用 LLM（有成本），仅在有价值的时机（研究完成）触发。

### 3. Memory 可以手动编辑吗？

**当前实现**：无手动编辑 UI。

**可能的未来功能**：
- 用户查看和编辑 memory（如 ChatGPT 的 Memory 管理）
- 删除特定记忆条目
- 手动添加重要信息

**技术上可行**：Memory 存储为 Markdown，易于编辑。

### 4. 团队级 Memory 如何工作？

**场景**：团队成员共享研究偏好和历史。

**实现**：
```typescript
// Load team memory if user is in a team
const teamMemory = await loadTeamMemory(teamId);
```

**用例**：
- 团队统一的研究方法论
- 共享的客户画像库
- 团队级别的工作偏好

**隔离性**：
- 用户级 Memory 只有该用户可见
- 团队级 Memory 所有成员共享
- 两者不冲突，可以同时加载

### 5. Memory 重组会丢失信息吗？

**不会丢失重要信息**：
- 重组只删除低质量提取（临时状态、一次性请求、冗余信息）
- 保留所有符合提取标准的持久化信息
- 合并重复内容，简化冗长描述

**示例**：
- **删除**："这次项目的预算是 50 万"（项目特定，非持久）
- **保留**："偏好数据支撑的分析"（持久偏好）
- **合并**：3 条关于"喜欢详细分析"的描述 → 1 条精炼表述

**版本历史**：
- 旧版本不删除，可以追溯
- `changeNotes` 记录变更说明

### 6. 如何防止提取错误或低质量信息？

**多层防护**：

1. **严格的提取标准**（memoryUpdateSystemPrompt）
   - 只提取 5 大类别
   - 每个类别有明确的"应该提取"和"不应该提取"
   - 强调"When in doubt, extract"但也强调质量标准

2. **自动重组清理**（memoryReorganizeSystemPrompt）
   - 删除不符合标准的信息
   - 删除临时状态和一次性请求
   - "Better safe than sorry"原则

3. **模型选择**
   - Update 用 `claude-haiku-4-5`（快速，任务简单）
   - Reorganize 用 `claude-sonnet-4-5`（高级推理，判断复杂）

### 7. Memory 会暴露用户隐私吗？

**安全措施**：

- **用户隔离**：每个用户的 memory 完全独立（`userId` 外键 + `onDelete: Cascade`）
- **团队隔离**：团队级 memory 只有成员可见（`teamId` 外键）
- **不提取敏感信息**：Memory 提取标准明确排除临时和敏感信息
- **版本控制**：可以追溯和删除特定版本

**最佳实践**：
- 不在 memory 中存储敏感数据（API keys, 密码等）
- Profile 信息仅提取明确声明的事实
- 如需删除用户，memory 自动级联删除（`onDelete: Cascade`）

### 8. Memory System 如何与 Reference Study 结合？

**两者协同**：

| 功能 | Memory System | Reference Study |
|------|--------------|----------------|
| **作用** | 长期记忆（用户背景、偏好） | 短期上下文（当前研究相关资料） |
| **来源** | 自动提取历史对话 | 用户主动选择历史研究 |
| **生命周期** | 永久（跨会话） | 临时（当前研究） |
| **加载顺序** | Phase 5: Reference Study Context<br>Phase 6: User Memory | 先 Reference，后 Memory |

**协同示例**：
- **Reference Study** 提供："你上次研究的 Olay Z 世代报告"（完整内容）
- **Memory** 提供："你持续关注 Z 世代消费行为"（模式识别）
- **AI 应用**："基于你的 Olay 研究和持续关注的 Z 世代模式，这次 Nike 研究可以重点关注..."

### 9. 未来会支持哪些功能？

**可能的增强**：

1. **手动 Memory 管理**
   - 用户查看所有 memory 条目
   - 编辑或删除特定记忆
   - 手动添加重要信息

2. **Memory 搜索和过滤**
   - 按类别搜索（只看 [ResearchHistory]）
   - 按时间范围过滤
   - 全文搜索

3. **Memory 导出/导入**
   - 导出为 Markdown 文件
   - 从文件导入 memory
   - 团队 memory 模板共享

4. **Memory 统计和洞察**
   - "你完成了 12 次 Z 世代研究"
   - "你最常用的研究方法是..."
   - 个性化 dashboard

5. **更细粒度的提取控制**
   - 用户自定义提取类别
   - 设置哪些信息自动提取，哪些需要确认

### 10. Memory System 的成本如何？

**Token 消耗**：

| 操作 | 模型 | 频率 | Token 消耗（估算） |
|------|------|------|------------------|
| **Memory Update** | claude-haiku-4-5 | 每次研究完成 | 500-1500 tokens |
| **Memory Reorganize** | claude-sonnet-4-5 | 超过 8000 tokens 时 | 2000-5000 tokens |
| **Memory Load** | N/A（数据库查询） | 每次对话开始 | 0 tokens（无 LLM 调用） |

**成本优化**：
- Update 用最便宜的 haiku 模型（任务简单）
- Reorganize 频率低（仅在超阈值时）
- Load 无 LLM 成本（直接数据库查询）

**典型用户**：
- 假设每月完成 20 次研究
- Memory Update: 20 × 1000 tokens = 20K tokens
- Memory Reorganize: 1 次（超阈值） = 3K tokens
- **总计**：~23K tokens/月（约 $0.01-0.02）

**结论**：Memory System 成本极低，相比研究本身的 token 消耗（50K-150K tokens/研究）可以忽略不计。

---

## 总结：Memory System 的价值

### 核心优势

1. **零重复沟通**：AI 记住你的背景和偏好，无需每次说明
2. **越用越懂**：每次研究后自动学习，理解越来越深入
3. **主动关联**：自动引用历史研究，连接过往洞察
4. **自然交互**：像老朋友一样，不炫耀记忆
5. **完美时机**：在合适场景提出未探索兴趣

### 适用场景

- **长期用户**：多次使用 atypica.AI 的用户受益最大
- **团队协作**：团队级 memory 让所有成员共享知识和偏好
- **持续研究**：同一领域多次研究，AI 能识别模式和主题
- **个性化需求**：需要 AI 理解独特工作方式的用户

### 技术亮点

- **双层架构**：Core（长期） + Working（短期）
- **自动重组**：超过阈值自动压缩和去重
- **版本管理**：支持历史追溯和恢复
- **用户+团队双级**：个人隔离 + 团队共享
- **成本极低**：每月约 $0.01-0.02
- **模型优化**：Update 用 haiku（快速），Reorganize 用 sonnet（智能）

### 代码位置总结

| 功能 | 文件路径 |
|------|---------|
| **Memory 加载** | `src/app/(memory)/lib/loadMemory.ts` |
| **Memory 更新** | `src/app/(memory)/lib/updateMemory.ts` |
| **重组逻辑** | `src/app/(memory)/lib/utils.ts` |
| **Update Prompt** | `src/app/(memory)/prompt/memoryUpdate.ts` |
| **Reorganize Prompt** | `src/app/(memory)/prompt/memoryReorganize.ts` |
| **Usage Prompt** | `src/app/(memory)/prompt/memoryUsage.ts` |
| **Update Tool** | `src/app/(memory)/tools/memoryUpdate/index.ts` |
| **集成点（baseAgentRequest）** | `src/app/(study)/agents/baseAgentRequest.ts:324-328` |
| **触发点（studyLog）** | `src/app/(study)/agents/studyLog/index.ts:53-61` |
| **数据库 Schema** | `prisma/schema.prisma:761-777` |

---

**Memory System 让 AI 真正理解你，而不是每次都从零开始。**
