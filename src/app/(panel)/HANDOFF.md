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

## 二、当前分支与 Git 状态

- **分支**：`feat/panel`
- **当前路由基线**（最终版）：
  - `/panels`：面板列表
  - `/panel/[panelId]`：面板详情
  - `/panel/project/[userChatToken]`：项目详情
- **旧路由状态**：`/persona/panels/...` 已删除，不再兼容跳转。
- **测试页状态**：`/panel/timeline` 测试页及专用 action 已删除。

## 三、路由结构

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

## 四、数据模型关系

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

**重要**：Discussion 和 Interview 目前通过 `personaPanelId` 关联到面板，而不是直接关联到某个 UserChat 项目。这意味着：
- 一个面板下的所有项目共享同一批 Discussion/Interview
- 项目详情页获取 discussions/interviews 时用的是 `panelId`，不是 `userChatToken`
- 这是当前的实现方式，后续如果需要区分"哪个项目产出的哪个讨论"，需要在 DiscussionTimeline/AnalystInterview 上加 `userChatId` 字段

## 五、Server Actions 清单

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
| `createStudyFromPanel(panelId, content)` | 创建新研究项目 | 面板详情页"新建项目"按钮 |
| `fetchProjectContextByToken(token)` | 按项目 token 反查 panelId + 项目基础信息 | 项目详情页 |
| `fetchDiscussionsByPanelId(panelId)` | 获取面板下所有讨论摘要 | 项目详情页 |
| `fetchDiscussionDetail(panelId, token)` | 获取讨论完整 timeline+personas | 项目详情页 |
| `fetchInterviewsByPanelId(panelId)` | 获取面板下所有访谈 | 项目详情页 |
| `fetchInterviewMessages(panelId, id)` | 懒加载单个访谈的消息 | InterviewsView 组件 |

## 六、关键组件行为

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
- 多个 Discussion 时右侧有编号切换器
- 空状态：Agent 运行中 → 转圈 + 提示文字

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

## 七、讨论执行引擎

讨论的后端执行逻辑在 `src/app/(panel)/lib/` 下，不在页面目录里：

- **`orchestration.ts`** — 主流程：循环 N 轮，每轮主持人选人→persona 回复→保存
- **`speaker-selection.ts`** — LLM 决定下一个发言者
- **`generation.ts`** — 生成 persona 回复、总结、纪要
- **`formatting.ts`** — 不同视角的 timeline 格式化
- **`persistence.ts`** — 数据库读写

讨论类型系统在 `src/app/(panel)/discussionTypes/`，支持 default（焦点小组）、debate（辩论）、roundTable（圆桌）。

**触发入口**：讨论和访谈是通过 Study Agent 的工具调用触发的：
- `src/app/(study)/tools/discussionChat/` → 调用 `runPersonaDiscussion()`
- `src/app/(study)/tools/interviewChat/` → 创建 AnalystInterview 记录

用户在面板详情页点"新建项目" → 创建 `UserChat(kind: study, context.personaPanelId: panelId)` → Agent 自动运行 → Agent 通过工具调用发起讨论/访谈 → 产出物写入 DiscussionTimeline/AnalystInterview → 项目详情页通过 panelId 查询展示。

## 八、i18n 结构

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

## 九、我踩过的坑

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

## 十、已完成的工作

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

## 十一、可能需要做的后续工作

以下是我观察到的但还没做的事情，用户没有明确要求，仅供参考：

1. **Discussion/Interview 与项目的精确关联**：目前 Discussion 和 Interview 通过 `personaPanelId` 关联到面板，不是关联到具体的 UserChat 项目。如果一个面板有多个项目，它们看到的 discussion/interview 是相同的。要区分需要加字段。

2. **多 Discussion 切换**：ProjectDetailClient 有编号切换器的 UI，但实际只加载了第一个 discussion 的详情（server component 里只 fetch 了 `discussionsResult.data[0]`）。切换器点击后不会重新加载其他 discussion 的数据。

3. **空状态优化**：项目刚创建时 Agent 还没跑出 discussion/interview，页面显示空状态。可以考虑加轮询来自动刷新。

4. **项目详情页的 metadata**：`projects/[userChatToken]/page.tsx` 没有 `generateMetadata`，可以加上。

5. **面板详情页的使用统计**：header 里显示了 `{discussions count} / {interviews count}`，这些计数现在来自 `panel.usageCount`，但概念上可能需要重新定义为"项目数"。

6. **讨论类型系统**：`discussionTypes/` 下有 default/debate/roundTable 三种类型，目前 UI 没有让用户选择讨论类型的入口。

## 十二、文件清单

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
