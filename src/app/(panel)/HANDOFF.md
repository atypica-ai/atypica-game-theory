# Panel 模块交接文档

> 写给接手此项目的 AI。这份文档覆盖了项目的架构、进度、已完成的工作、未完成的工作、以及我踩过的坑。

## 一、你接手的是什么

Panel 是 atypica.AI 平台的**研究面板**功能。核心概念：

- **PersonaPanel**（面板）：一组 AI Persona 的集合，可以被反复使用进行各种研究
- **研究项目**（Research Project）：绑定在面板上的 `UserChat`，代表一次具体的研究任务
- **Discussion**（讨论）：多 persona 群聊，项目的产出物之一
- **Interview**（访谈）：一对一深度访谈，项目的产出物之一

**关键认知**：Discussion 和 Interview 不是独立实体，它们是研究项目的"产出物"。用户看到的页面层级是：

```
面板列表 → 面板详情（含项目列表+人物列表）→ 项目详情（含 Discussion/Interview tab）
```

## 二、架构与设计逻辑

这一节记录了产品 owner 在设计讨论中确认的核心设计决策。不是我猜的，是跟他反复确认过的。

### 2.1 两种模式：Agent 模式 vs 传统 UI 模式

Panel 功能存在两种使用模式，但它们**不是用户切换的**，而是同一个研究流程的不同阶段：

**Agent 模式**（主要模式）：
- 用户在面板详情页点"新建项目"，输入研究问题
- 系统创建一个 `UserChat`（研究项目），Agent 自动开始运行
- Agent（Universal Agent，内部调用 study tools）根据研究问题自主决定：要不要做讨论？要不要做访谈？选哪些 persona？
- Agent 通过工具调用（`discussionChat`、`interviewChat`）触发讨论和访谈
- 讨论和访谈的结果写入数据库，前端通过轮询展示
- 用户可以在 `/universal/{token}` 页面跟 Agent 对话，干预研究方向

**传统 UI 模式**（展示模式）：
- 项目详情页（`/panel/project/{token}`）是传统的、非对话式的结构化 UI
- 用 tab 展示 Agent 产出的 Discussion 和 Interview
- Discussion 用三栏布局展示 timeline
- Interview 用两栏布局展示访谈记录
- 用户在这里**只读**——看研究结果，不做操作

**核心设计思路**：Agent 负责"做研究"，传统 UI 负责"看结果"。两者通过 `UserChat.token` 连接。项目详情页提供"View Agent Chat"链接跳回 Agent 对话页。

### 2.2 核心概念定义

**UserChat（研究项目）**：
- 数据库中的 `UserChat` 记录，`kind` 字段标识类型（`study`、`universal` 等）
- `context` 是 JSON 字段，`context.personaPanelId` 关联到面板
- `backgroundToken` 非 null 表示后台 Agent 正在运行
- 一个 UserChat = 一个研究项目 = 一次完整的研究任务
- `kind` 在创建时确定，不可变

**PersonaPanel（面板）**：
- 一组 persona 的组合，`personaIds: number[]` 记录成员
- 可被多个项目复用
- 创建方式有两种：
  1. 用户在面板列表页手动创建（目前主要入口）
  2. Agent 通过 `recordPersonaPanelContext()` 在工具调用时自动创建或合并

**Discussion（讨论）**：
- 存储在 `DiscussionTimeline` 表
- 多 persona 群聊，有主持人（Moderator）控场
- 主持人是 LLM 驱动的，自动选择下一个发言者、提出问题、引导方向
- 每轮产出：主持人选人 → 主持人追问 → persona 回复
- 最终产出：summary（总结）+ minutes（会议纪要）
- 事件类型：`question`（用户/主持人提问）、`persona-reply`（persona 回复）、`moderator`（主持人总结）、`moderator-selection`（选人记录）
- 默认 12 轮讨论，每轮实时保存到数据库

**Interview（访谈）**：
- 存储在 `AnalystInterview` 表
- 一对一深度访谈：一个 interviewer agent 对一个 persona agent
- 每个 persona 有独立的 `interviewUserChat` 存储消息
- interviewer 和 persona 交替发言，像真实访谈一样
- 消息上限 14 条，到达后强制 `saveInterviewConclusion`
- 多个 persona 的访谈是并行执行的（`Promise.all`）
- 最终产出：每个 persona 的 conclusion + 整体 summary
- Persona agent 可以使用社交媒体搜索工具（tiktok、douyin、ins、twitter），让回答更真实

**backgroundToken 机制**：
- `UserChat.backgroundToken` 是 Agent 后台运行的标识
- 非 null = Agent 正在跑，前端显示绿色脉冲 + "Agent Running"
- Agent 完成后设为 null
- Interview 的 `interviewUserChat` 也有自己的 backgroundToken，用于标识单个访谈是否在进行

### 2.3 关键设计决策

**"不存在独立的 Discussion 或 Interview 页面"**：
- 这是产品 owner 最重要的设计决策
- 最初我做了独立的 `/discussions/[token]` 和 `/interviews` 路由
- 后来 owner 明确：Discussion 和 Interview 只是项目的产出物，不是独立实体
- 所以全部收纳到项目详情页（`/panel/project/[userChatToken]`），用 tab 切换
- 旧的独立路由已全部删除

**项目详情页以 UserChat token 为 URL 主键**：
- 不用 panelId + 其他 ID 的组合
- `UserChat.token` 是全局唯一的，可以直接定位到项目
- 通过 `context.personaPanelId` 反查面板信息

**Discussion/Interview 的展示范围按“项目消息”确定**：
- `DiscussionTimeline` 和 `AnalystInterview` 的存储层仍使用 `personaPanelId`
- 但项目详情页不会按 panel 直接全量读取，而是从当前 `UserChat.messages`（DB → AI message）中提取本项目触发过的 `discussionChat` / `interviewChat` tool 调用
- 因此展示层已经做到“按项目隔离”，无需新增外键即可避免不同项目串数据

**Panel 的创建时机**：
- 面板可以先于项目存在（用户手动创建）
- 也可以在 Agent 运行时自动创建（`recordPersonaPanelContext`）
- 如果 UserChat 已经有 `context.personaPanelId`，Agent 会复用现有面板并合并新的 persona
- 如果没有，Agent 会创建新面板

### 2.4 完整数据流

```
用户操作                Agent 运行                    数据库写入                    前端展示
─────────────────────────────────────────────────────────────────────────────────────────────

1. 在面板详情页        createUniversalAgentFromPanel()  UserChat (kind: universal,
   输入研究问题         ─────────────────→            context.personaPanelId)
   点击"开始研究"                                     backgroundToken = xxx

2.                     createUniversalAgentFromPanel
                       直接 await executeUniversalAgent()
                       分析研究问题，决定策略

3.                     调用 discussionChat 工具       recordPersonaPanelContext()     项目详情页
                       ─────────────────→            创建/合并 PersonaPanel          轮询检测到
                                                     创建 DiscussionTimeline         Discussion tab
                       runPersonaDiscussion()         (events 逐轮追加)              出现
                       循环 12 轮                     每轮 saveTimelineEvent()
                       ─────────────────→            写入 summary + minutes

4.                     调用 interviewChat 工具        创建 AnalystInterview (N个)     项目详情页
                       ─────────────────→            创建 interviewUserChat (N个)    Interview tab
                       N 个 persona 并行访谈          每条消息实时保存               出现
                       interviewer ↔ persona         写入 conclusion
                       交替对话

5.                     Agent 继续处理                 可能还会生成报告、播客等
                       （generateReport 等）

6.                     Agent 完成                     backgroundToken = null          绿色脉冲消失
```

### 2.5 讨论引擎详细流程

```
buildDiscussionType(instruction)
  └→ LLM 根据用户指令动态生成讨论配置（主持人风格、persona 行为指引）

initializeDiscussionTimeline()
  └→ 加载 personas，创建初始 timeline（第一条事件：用户提问）

循环 maxRounds 轮:
  selectNextSpeakerModerator()
    └→ LLM 分析 timeline，决定：谁发言、问什么、为什么选他
    └→ 写入 moderator-selection 事件 + question 事件
    └→ 实时 saveTimelineEvent()

  generatePersonaReply()
    └→ persona 看到的 timeline 经过 formatTimelineForPersona() 过滤
    └→ persona 只看主持人的问题，看不到初始用户问题（模拟真实讨论）
    └→ 写入 persona-reply 事件
    └→ 实时 saveTimelineEvent()

generateSummaryAndMinutes()（并行）
  ├→ generateModeratorSummary() → 面向研究目标的总结
  └→ generateDiscussionMinutes() → 无损记录，按时间顺序
```

### 2.6 访谈引擎详细流程

```
interviewChatTool.execute({ personas, instruction })
  └→ recordPersonaPanelContext()  → 创建/合并面板
  └→ Promise.all(personas.map(single))  → 并行访谈每个 persona

single(persona):
  prepareDBForInterview()
    ├→ 创建 AnalystInterview 记录
    ├→ 创建 interviewUserChat (kind: "interview")
    └→ 生成 prompt（personaPrompt + interviewerPrompt）

  runInterview()
    └→ 设置 backgroundToken（标识运行中）
    └→ while(true) 循环:
        chatWithPersona(messages)
          └→ persona agent 回复（可使用社交媒体搜索工具）
          └→ 保存消息到 interviewUserChat
        chatWithInterviewer(messages)
          └→ interviewer agent 提问或总结
          └→ 消息数 >= 14 时强制 saveInterviewConclusion
          └→ 保存消息到 interviewUserChat
        检查 conclusion 是否已写入 → 有则 break
    └→ 清除 backgroundToken

  generateInterviewSummary()
    └→ 汇总所有 persona 的 conclusion，生成整体总结
```

## 三、当前分支与 Git 状态（注意：可能已过时，以实际 git status 为准）

- **分支**：`feat/panel`
- **当前路由基线**（最终版）：
  - `/panels`：面板列表
  - `/panel/[panelId]`：面板详情
  - `/panel/project/[userChatToken]`：项目详情
- **旧路由状态**：`/persona/panels/...` 已删除，不再兼容跳转。
- **测试页状态**：`/panel/timeline` 测试页及专用 action 已删除。

## 四、路由结构

```
src/app/(panel)/(page)/
├── panels/
│   ├── actions.ts                            → 列表页 action
│   ├── page.tsx                              → /panels
│   └── PanelsListClient.tsx
└── panel/
    ├── [panelId]/
    │   ├── actions.ts                        → 面板详情 action
    │   ├── page.tsx                          → /panel/:panelId
    │   └── PanelDetailClient.tsx
    ├── project/
    │   ├── actions.ts                        → 通用 action（跨目录复用）
    │   └── [userChatToken]/
    │       ├── actions.ts                    → 项目详情 action
    │       ├── page.tsx                      → /panel/project/:userChatToken
    │       ├── ProjectDetailClient.tsx
    │       ├── DiscussionView.tsx
    │       └── InterviewsView.tsx
    
```

## 五、数据模型关系

```
PersonaPanel (面板)
  ├── personaIds: number[]              → 引用 Persona 表
  ├── discussionTimelines[]             → DiscussionTimeline (1:N)
  └── analystInterviews[]               → AnalystInterview (1:N)

UserChat (研究项目)
  ├── context.personaPanelId: number    → 引用 PersonaPanel
  ├── kind: "study" | "universal" | ... → 项目类型
  └── backgroundToken: string | null    → 非 null 表示 Agent 运行中

DiscussionTimeline (讨论)
  ├── personaPanelId                    → 引用 PersonaPanel
  ├── events: DiscussionTimelineEvent[] → JSON 事件列表
  ├── summary: string                   → 讨论总结
  └── minutes: string                   → 讨论纪要

AnalystInterview (访谈)
  ├── personaPanelId                    → 引用 PersonaPanel
  ├── personaId                         → 引用 Persona
  ├── conclusion: string                → 访谈结论
  └── interviewUserChatId               → 引用 UserChat (存消息)
```

**重要（已更新）**：项目详情页的数据源现在是**当前 UserChat 的 messages parts**。
- 通过 `tool-discussionChat` / `tool-interviewChat` 的调用记录提取本项目的讨论与访谈批次
- `DiscussionTimeline` / `AnalystInterview` 仍然通过 `personaPanelId` 存储，但页面展示范围已由“整面板”收敛到“当前项目触发的 tool calls”
- 无需新增外键即可避免同一 panel 下不同项目互相串数据

## 六、Server Actions 清单

已按目录拆分（每个目录只有一个 `actions.ts`）：

- `src/app/(panel)/(page)/panels/actions.ts`
- `src/app/(panel)/(page)/panel/[panelId]/actions.ts`
- `src/app/(panel)/(page)/panel/project/[userChatToken]/actions.ts`
- `src/app/(panel)/(page)/panel/project/actions.ts`（通用）

| 函数 | 用途 | 调用方 |
|------|------|--------|
| `fetchDiscussionTimeline(timelineToken)` | 获取 discussion timeline（轮询） | `DiscussionView`、`DiscussionChatConsole` |
| `fetchUserPersonaPanels()` | 获取用户所有面板 | 列表页 |
| `fetchPersonaPanelById(panelId)` | 获取面板详情+完整 persona 信息 | 面板详情页、项目详情页 |
| `deletePersonaPanel(panelId)` | 删除面板（有使用记录则拒绝） | 列表页 |
| `fetchResearchProjectsByPanelId(panelId)` | 获取面板下所有 UserChat 项目 | 面板详情页 |
| `createUniversalAgentFromPanel(panelId, content)` | 创建新研究项目 | 面板详情页"新建项目"按钮 |
| `fetchProjectContextByToken(token)` | 按项目 token 反查 panelId + 项目基础信息 | 项目详情页 |
| `fetchProjectResearchByToken(token)` | 从当前项目 messages 提取 discussions + interview batches | 项目详情页 |
| `fetchDiscussionDetail(token)` | 获取讨论完整 timeline+personas（含权限校验） | 项目详情页 |
| `fetchInterviewBatchesByProjectToken(token)` | 轮询刷新当前项目的访谈批次 | InterviewsView 组件 |
| `fetchInterviewMessages(interviewUserChatToken)` | 懒加载单个访谈的消息 | InterviewsView 组件 |

## 七、关键组件行为

### PanelDetailClient

面板详情页。两个 section：
1. **Research Projects** — 项目列表，每项链接到 `/panel/project/{token}`
2. **Personas** — 3 列网格，点击弹出 Dialog 显示 persona 详情

特殊逻辑：
- `getKindLabel(kind)` 用 if 语句逐个匹配 i18n key（不用动态模板，用户要求的）
- 新建项目后自动跳转到项目详情页
- `backgroundToken` 非空时显示绿色脉冲点

### ProjectDetailClient

项目详情容器。布局：
```
┌─────────────────────────────────────────┐
│ ← Panel Title       [Agent Running]    │
│ Project Title                           │
│ [Discussion] [Interviews]   [View Chat →]│
├─────────────────────────────────────────┤
│ (DiscussionView 或 InterviewsView)      │
└─────────────────────────────────────────┘
```

- Tab 动态显示：只有有数据的 tab 才出现
- 多个 Discussion 时右侧有编号切换器（支持切换并加载对应详情）
- Interview 按 tool 调用批次分组，可切换 batch
- 空状态：Agent 运行中 → 转圈 + 实时进度（轮询）

### DiscussionView（三栏布局）

```
┌──────────┬──────────────────┬──────────┐
│ Personas │    Timeline      │ Analysis │
│ (左栏)   │    (中栏)        │ (右栏)   │
│          │                  │ Summary  │
│ ✓ Alice  │ Q: What do you..│ Minutes  │
│ ✓ Bob    │ Alice: I think.. │          │
│ ○ Carol  │ Bob: Well...     │          │
└──────────┴──────────────────┴──────────┘
```

- 5 秒轮询更新（讨论进行中时）
- 自动滚动到底部
- 事件类型：question / persona-reply / moderator / moderator-selection

### InterviewsView（两栏布局）

```
┌───── Progress: 3/5 completed ──────────┐
├──────────┬──────────────────┬──────────┤
│ Personas │    Messages      │ Analysis │
│ ✓ Alice  │ Q&A with Alice   │ Status   │
│ ⟳ Bob   │                  │ Count    │
│ ○ Carol  │                  │Conclusion│
└──────────┴──────────────────┴──────────┘
```

- 左栏选择 persona → 右侧懒加载消息
- 5 秒轮询：整体状态 + 选中访谈的消息
- 三种状态：completed(绿)、in-progress(橙+转圈)、pending(灰)

## 八、讨论执行引擎

讨论的后端执行逻辑在 `src/app/(panel)/lib/` 下，不在页面目录里：

- **`orchestration.ts`** — 主流程：循环 N 轮，每轮主持人选人→persona 回复→保存
- **`speaker-selection.ts`** — LLM 决定下一个发言者
- **`generation.ts`** — 生成 persona 回复、总结、纪要
- **`formatting.ts`** — 不同视角的 timeline 格式化
- **`persistence.ts`** — 数据库读写

讨论类型系统在 `src/app/(panel)/discussionTypes/`，支持 default（焦点小组）、debate（辩论）、roundTable（圆桌）。

**触发入口**：讨论和访谈是通过 Universal Agent（调用 study tools）的工具调用触发的：
- `src/app/(study)/tools/discussionChat/` → 调用 `runPersonaDiscussion()`
- `src/app/(study)/tools/interviewChat/` → 创建 AnalystInterview 记录

用户在面板详情页点"新建项目" → 创建 `UserChat(kind: universal, context.personaPanelId: panelId)` → 立即执行 `executeUniversalAgent()`（不等待跳转到 `/universal/{token}`）→ Agent 通过工具调用发起讨论/访谈 → 产出物写入 DiscussionTimeline/AnalystInterview → 项目详情页按项目消息提取展示。

## 九、i18n 结构

消息文件在 `src/app/(panel)/messages/{en-US,zh-CN}.json`，顶层 key 是 `PersonaPanel`：

```
PersonaPanel
├── (顶层：通用文案)
├── ListPage.*           → 面板列表页
├── DetailPage.*         → 面板详情页
├── ProjectDetailPage.*  → 项目详情页
├── DiscussionDetailPage.* → DiscussionView 组件
└── InterviewsPage.*     → InterviewsView 组件
```

## 十、我踩过的坑

### 1. `getKindLabel` 不能用动态模板
```typescript
// ❌ next-intl 的 try/catch 不管用，缺少 key 直接报 MISSING_MESSAGE
const key = `DetailPage.projectKind.${kind}` as const;
try { return t(key as any); } catch { return t("default"); }

// ✅ 用户要求用 if 一个个列出来
if (kind === "study") return t("DetailPage.projectKind.study");
if (kind === "universal") return t("DetailPage.projectKind.universal");
// ...
return t("DetailPage.projectKind.default");
```

### 2. TypeScript 条件推断 + let 声明不兼容
```typescript
// ❌ let + 后续赋值，TS 推断不出类型
let discussionDetail = null;
if (...) discussionDetail = result.data; // Type '{ ... }' not assignable to 'null'

// ✅ 用组件 Props 类型标注
let discussionDetail: ProjectDetailClientProps["discussionDetail"] = null;
```

### 3. FitToViewport 的使用
Panel 的 `(page)/layout.tsx` 已设置 `fitToViewport={true}`，所以子页面的顶层组件需要是 flex 布局来填满视口。DiscussionView 和 InterviewsView 从独立页面迁移过来时要去掉 `<FitToViewport>` 包装，改为 `flex-1 flex flex-col overflow-hidden`。

### 4. Prisma JSON 查询
`UserChat.context` 是 JSON 字段，查询 `personaPanelId` 用 Prisma 的 JSON path filter：
```typescript
where: {
  context: {
    path: ["personaPanelId"],
    equals: panelId,
  },
}
```

### 5. PersonaExtra 类型
`Persona.extra` 字段的类型是 `PersonaExtra`（从 `@/prisma/client` 导入），包含 `role`、`ageRange`、`location`、`title`、`industry`、`organization`、`experience` 等字段。

## 十一、已完成的工作

按时间线：

1. ✅ Panel 列表页（PersonaPanelsListClient）
2. ✅ Panel 详情页（PanelDetailClient + persona grid + persona dialog）
3. ✅ Research Projects section（项目列表 + 新建项目对话框）
4. ✅ Server actions（全部 10 个函数）
5. ✅ Discussion 三栏布局（从独立页面迁移到 DiscussionView）
6. ✅ Interview 两栏布局（从独立页面迁移到 InterviewsView）
7. ✅ 项目详情页（ProjectDetailClient + tab nav）
8. ✅ 旧路由删除（discussions/、interviews/ 独立路由）
9. ✅ i18n 清理（新增 ProjectDetailPage keys，清理废弃 keys）
10. ✅ getKindLabel 修复（用 if 替代动态模板）
11. ✅ `pnpm build` 通过

## 十二、可能需要做的后续工作

以下是我观察到的但还没做的事情，用户没有明确要求，仅供参考：

1. **Interview 记录复用语义**：`interviewChat` 目前会复用同一 `personaPanelId + personaId` 的历史访谈记录（若已有 conclusion），这是既有设计。若希望“每个项目都生成独立访谈实例”，需要调整 `interviewChat` 的 DB 写入策略。

2. **项目详情页的 metadata**：`projects/[userChatToken]/page.tsx` 没有 `generateMetadata`，可以加上。

3. **面板详情页的使用统计**：header 里显示了 `{discussions count} / {interviews count}`，这些计数现在来自 `panel.usageCount`，但概念上可能需要重新定义为"项目数"。

4. **讨论类型系统**：`discussionTypes/` 下有 default/debate/roundTable 三种类型，目前 UI 没有让用户选择讨论类型的入口。

## 十三、文件清单

### 你最需要关注的文件

| 文件 | 作用 |
|------|------|
| `src/app/(panel)/(page)/panels/actions.ts` | 列表页 action |
| `src/app/(panel)/(page)/panel/[panelId]/actions.ts` | 面板详情 action |
| `src/app/(panel)/(page)/panel/project/[userChatToken]/actions.ts` | 项目详情 action |
| `src/app/(panel)/(page)/panel/project/actions.ts` | 通用 action（discussion timeline 读取） |
| `src/app/(panel)/(page)/panels/page.tsx` | `/panels` 路由入口 |
| `src/app/(panel)/(page)/panel/[panelId]/page.tsx` | `/panel/[panelId]` 路由入口 |
| `src/app/(panel)/(page)/panel/project/[userChatToken]/page.tsx` | `/panel/project/[userChatToken]` 路由入口 |
| `PanelDetailClient.tsx` | 面板详情页（项目列表+人物列表） |
| `ProjectDetailClient.tsx` | 项目详情页容器（tab+布局） |
| `DiscussionView.tsx` | 讨论展示组件（三栏） |
| `InterviewsView.tsx` | 访谈展示组件（两栏） |
| `en-US.json` / `zh-CN.json` | i18n 文案 |
| `types.ts` | DiscussionTimelineEvent 等类型定义 |

### 相关但不在 panel 目录下的文件

| 文件 | 作用 |
|------|------|
| `src/app/(study)/context/types.ts` | `UserChatContext` 类型定义（含 personaPanelId） |
| `src/app/(study)/tools/discussionChat/` | Agent 工具：发起讨论 |
| `src/app/(study)/tools/interviewChat/` | Agent 工具：发起访谈 |
| `src/app/(panel)/lib/orchestration.ts` | 讨论执行引擎主流程 |
| `src/app/(panel)/lib/persistence.ts` | 讨论数据持久化 |

---

*Last updated: 2026-02-18*
*Author: Claude (Opus 4.6) + Codex (GPT-5)*
*Branch: feat/panel*
