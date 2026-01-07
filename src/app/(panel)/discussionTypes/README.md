# Discussion Types / 讨论类型配置

定义和管理不同的讨论类型（焦点小组、辩论、圆桌等）。

## 核心概念

讨论类型的本质是**主持人的控场方式**，通过 `moderatorSystem` 定义：

- 主持人角色和互动风格
- 谁下一个发言、问什么问题
- 控制程度：主动干预 vs. 自然流动
- 讨论目标：共识、张力、深度、广度

## 架构

### `index.ts` - 单一数据源

所有讨论类型在此注册：

```typescript
const discussionTypeConfigs = {
  default: defaultConfig, // 焦点小组
  debate: debateConfig, // 辩论
  roundtable: roundtableConfig, // 圆桌
} as const;
```

TypeScript 自动推导 `DiscussionType` 类型，添加新类型只需一行注册。

### 配置接口

```typescript
interface DiscussionTypeConfig {
  moderatorSystem: (params: { locale: Locale }) => string; // 主持人提示词 ⭐
  panelSummarySystem: (params: { locale: Locale }) => string; // 总结提示词
  panelRules: (params: { locale: Locale }) => string; // 参与规则
}
```

## 预设类型

| 类型         | 主持风格       | 控制程度 | 适用场景           |
| ------------ | -------------- | -------- | ------------------ |
| `default`    | 市场调研主持人 | 中等控制 | 市场研究、用户调研 |
| `debate`     | 中立裁判       | 公平控场 | 政策讨论、方案对比 |
| `roundtable` | 促进者         | 低控制   | 专家交流、头脑风暴 |

## `buildDiscussionType` - 动态生成

### 作用

根据用户指令**动态生成**自定义的 `moderatorSystem`，实现任意讨论风格。

### 工作原理

```
用户指令
  ↓
【LLM 分析】(Claude Sonnet 4.5 + Extended Thinking)
  ├─ 提取讨论类型需求（辩论？圆桌？混合？）
  ├─ 分析讨论目标（共识？对抗？探索？）
  └─ 识别特殊要求（正式程度、互动强度等）
  ↓
【生成 moderatorSystem】
  ├─ 角色定义（30字）
  ├─ 核心目标（1-3条要点）
  ├─ 主持行为指令（100-150字）
  └─ 讨论流程（3-4阶段）
  ↓
返回 DiscussionTypeConfig（moderatorSystem 定制，其余用默认）
```

### 使用场景

1. **混合风格**："先辩论再圆桌讨论达成共识"
2. **特殊场景**："炉边谈话风格的产品测试"
3. **定制需求**："高度结构化的专家咨询"

### 关键特性

- **输入**：用户的完整指令（包含问题 + 讨论风格要求）
- **输出**：定制的 `moderatorSystem`（其他配置使用 `default`）
- **教学示例**：系统提示词中包含 `default` 配置作为参考
- **防止过度干预**：明确禁止在提示词中预设访谈结论

### 示例

**用户指令**：

```
讨论：远程工作是否应该成为强制要求？请以辩论形式进行，
正方支持远程，反方支持办公室，主持人要确保双方充分交锋。
```

**生成的 moderatorSystem**：

```
角色：你是中立的辩论主持人，确保正反双方获得公平发言机会。

目标：
1. 让正反双方充分表达观点并直接交锋
2. 揭示远程工作的核心利弊和权衡

主持行为：
- 严格控制发言顺序，确保双方轮流发言
- 当出现模糊陈述时，追问具体案例和数据
- 发现矛盾时，让对方直接回应
- 避免个人倾向，保持中立

流程：
阶段1（立场）：双方陈述核心观点（各2轮）
阶段2（交锋）：直接反驳对方论点（3-4轮）
阶段3（证据）：要求双方提供支持证据（2轮）
阶段4（总结）：归纳共识和剩余分歧
```

## 添加预设类型

1. 创建 `discussionTypes/newType/` 目录
2. 实现 `index.ts` 导出配置
3. 在 `discussionTypes/index.ts` 添加一行注册

TypeScript 自动更新类型系统。
