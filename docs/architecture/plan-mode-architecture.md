# Plan Mode 流程说明

## 概述

Plan Mode 是所有研究的默认入口（Intent Layer），负责将用户的模糊需求转化为可执行的研究意图。

## 流程图

```
用户创建研究 (analyst.kind = null)
  ↓
Plan Mode Agent 运行
  ├─ 对话澄清意图（灵活轮数，直到意图清晰）
  ├─ requestInteraction 交互澄清（可选，任何需要用户选择或确认的场景）
  ├─ webSearch/webFetch 背景调研（灵活使用）
  ├─ AI 自动判断 kind/框架/方式
  ├─ 成本估算
  ├─ makeStudyPlan 展示计划（一次性输出完整信息）
  └─ 用户确认 → 前端 saveAnalystFromPlan → addToolResult
  ↓
Router 判断 analyst.kind
  ├─ productRnD → Product R&D Agent
  ├─ fastInsight → Fast Insight Agent
  └─ testing/insights/creation/planning/misc → Study Agent
  ↓
执行 Agent 运行
  ├─ 从 messages 读取意图
  ├─ planStudy/planPodcast 规划细节
  └─ 执行研究 → 生成报告/播客
```

## 数据存储

### messages（主数据源）

- Plan Mode 的澄清对话
- requestInteraction 的确认内容（对象、场景、维度、框架、方式）
- 执行 Agent 从这里读取意图

**重要**：messages 是用户和 LLM 的对话历史，在同一个 UserChat 中天然持续存在。只要继续使用同一个对话，messages 就一直在那里，不需要额外传递。Plan Mode 和执行 Agent 看到的是同一个 messages 数组。

### analyst（元数据）

- `kind`：路由判断（7个值：productRnD, fastInsight, testing, insights, creation, planning, misc）
- `role`, `topic`, `locale`：基本信息
- `extra`：不存 plan 内容（已在 messages 中）

## 两层 Plan

### Plan Mode（战略层 - Intent Layer）

**职责**：意图澄清、自动判断、成本估算、用户审批

**输出**：

- messages + analyst (kind, role, topic, locale)

**不调用**：planStudy/planPodcast（这些是执行 Agent 的工具）

### planStudy/planPodcast（战术层）

**职责**：规划执行细节（问题、搜索、报告结构）

**输入**：从 messages 读取已明确的意图

**不再做**：选择框架和研究方式（已在 Plan Mode 完成）

## 关键设计原则

- **messages 是 source of truth**：意图、对话、决策都在 messages 中
- **analyst 是路由元数据**：只存 kind, role, topic, locale
- **两层 Plan 清晰分工**：Plan Mode 决策"做什么"，planStudy/planPodcast 规划"怎么做"
- **执行 Agent 从历史读取**：不需要额外传递意图，从 messages 推断即可
- **灵活澄清过程**：没有轮数限制，可以多轮对话，直到意图完全清晰
- **灵活工具使用**：webSearch 和 webFetch 可根据需要灵活使用，不做人为限制

## 关键文件

### 核心路由和配置

- **Router**: `src/app/(study)/api/chat/study/route.ts:152-173`
- **Plan Mode Agent**: `src/app/(study)/agents/configs/planModeAgentConfig.ts`
- **Plan Mode Prompt**: `src/ai/prompt/study/planMode.ts`
- **makeStudyPlan Tool**: `src/ai/tools/system/makeStudyPlan/`

### 执行 Agent Prompts

- **Study**: `src/ai/prompt/study/study.ts:41-51` (研究意图状态)
- **Product R&D**: `src/ai/prompt/study/productRnD.ts:37-39` (研究意图状态)
- **Fast Insight**: `src/ai/prompt/study/fastInsight.ts:19-21` (研究意图状态)

### 战术规划工具

- **planStudy**: `src/ai/prompt/study/planStudy.ts:27-32` (重要提示)
- **planPodcast**: `src/ai/prompt/study/planPodcast.ts:13-18` (重要提示)

### 统一工具

- **saveAnalyst**: `src/ai/tools/system/saveAnalyst/types.ts:18-33` (统一 7 个 kind)

## 状态转换

```
初始状态
  analyst.kind = null
  messages = [用户首条消息]
  ↓
Plan Mode 运行中
  messages = [Plan Mode 对话 + 澄清 + 确认]
  analyst.kind = null
  ↓
用户确认"开始执行"
  saveAnalyst 调用
  analyst.kind = "productRnD" | "fastInsight" | "testing" | ...
  analyst.role, topic, locale 已设置
  ↓
Router 路由到执行 Agent
  执行 Agent 从 messages 读取完整意图
  执行研究流程
```

## 边界情况

### 用户拒绝计划

- Plan Mode 提示"研究已取消"
- 不调用 saveAnalyst
- analyst.kind 保持 null
- 用户可重新开始新对话

### 用户修改计划

- 使用 requestInteraction 询问修改内容
- 回到对应步骤重新规划
- 再次请求审批

### Plan Mode 中断

- analyst.kind 仍为 null
- 下次消息仍进入 Plan Mode
- Plan Mode 从 messages 历史中恢复对话状态

### analyst.kind 已存在

- Router 逻辑确保只有 `!analyst.kind` 才进入 Plan Mode
- 已有 kind 的会路由到对应执行 agent

## 调试和监控

### 判断当前处于哪个阶段

1. **Plan Mode**: `analyst.kind === null`
2. **执行 Agent**: `analyst.kind` 有值
3. **从 messages 判断**：查看最近的对话是否包含意图澄清内容

### 常见问题

**Q: 为什么执行 Agent 看不到 Plan Mode 的决策？**
A: 决策都在 messages 中。执行 Agent 通过读取 messages 历史来理解意图。

**Q: 如果用户想修改已确定的意图怎么办？**
A: 执行 Agent 可以根据用户的新要求调整。但如果是根本性的意图改变，建议开启新的研究对话。

**Q: Plan Mode 和 planStudy/planPodcast 的区别是什么？**
A: Plan Mode 是战略层，决定"研究什么、用什么框架、用什么方式"；planStudy/planPodcast 是战术层，规划"具体怎么执行"。

## 版本历史

- v1.0 (2026-01) - 初始版本，实现 Plan Mode MVP
