# Pulse

趋势脉冲系统 — 从社交媒体采集热点话题，计算热度分数，自动过期低价值内容，并为用户生成个性化推荐。

## 设计思路

每个 Pulse 是一个 **趋势话题**（如 "AI Agents 替代 SaaS"），有热度分数（HEAT）和日变化量（heatDelta）。

**简化的 schema 设计**：
- `Pulse.category` 是字符串（如 `"AI Tech"`），不是外键 — 类别是轻量标签，不需要单独的表
- `Pulse.extra` 是 typed JSON（`PulseExtra`），帖子数据存在 `extra.posts` 里 — 帖子永远跟随 Pulse 查询，不需要单独的 `PulsePost` 表
- xTrend 的 category→query 映射存在 `SystemConfig` 表（key: `pulse:xTrend:categories`）

**核心数据流**：采集 → 身份匹配 → HEAT 计算 → 过期淘汰 → 用户推荐

## 目录结构

```
src/app/(pulse)/
├── dataSources/                # 数据源层
│   ├── index.ts                # 注册表（唯一注册入口）
│   ├── types.ts                # DataSource / DataSourceFactory 接口
│   └── xTrend/                 # Twitter/X 趋势（通过 Grok 采集）
│       ├── factory.ts          # 工厂：从 SystemConfig 读类别，每类别生成一个 DataSource
│       └── gatherPulsesWithGrok.ts  # Grok 采集 + 解析
├── lib/                        # 核心处理逻辑
│   ├── gatherSignals.ts        # 采集编排：调数据源 → 写入 DB → 身份匹配
│   ├── processPulseIdentity.ts # 身份修复：按 (category + title) 匹配昨日脉冲，继承热度
│   ├── fixPulseIdentity.ts     # LLM 辅助的标题相似度匹配
│   ├── pulseFilters.ts         # 通用查询过滤器（非过期 + 未到期）
│   └── runDailyPipeline.ts     # 每日全流程：采集 → HEAT → 过期
├── heat/                       # HEAT 评分管道
│   ├── index.ts                # 主管道（并行 10 worker 批处理）
│   ├── gatherPosts.ts          # 通过 Grok + x-search 采集帖子
│   ├── calculateHeat.ts        # HEAT 公式: (reach^0.6 × intensity^0.4) × 1000
│   ├── generateDescription.ts  # 从帖子生成脉冲摘要
│   └── config.ts               # 评分权重、并发数等配置
├── expiration/                 # 过期淘汰
│   ├── index.ts                # 按类别: 保留新 + 高 delta + Top N，淘汰其余
│   └── config.ts               # 阈值、Top N 限制
├── recommendation/             # 个性化推荐
│   ├── recommendPulses.ts      # 单用户推荐：LLM 过滤（有记忆）或随机（无记忆）
│   ├── recommendForActiveUsers.ts # 批量推荐：查活跃用户 → 并行处理
│   ├── prompt.ts               # 推荐 prompt
│   ├── config.ts               # 活跃天数、推荐数量等配置
│   ├── types.ts                # 推荐结果类型
│   └── index.ts                # 导出
└── pulse/                      # 前端页面 (/pulse)
    ├── page.tsx                # 页面入口
    ├── layout.tsx              # 布局
    ├── actions.ts              # Server actions（前端数据获取）
    ├── PulseMarketplaceClient.tsx # 主客户端组件
    ├── usePulseMapData.ts      # Treemap 数据 hook
    ├── utils/sorting.ts        # 排序：正 delta → 新 → 零/负
    └── components/             # UI 组件
        ├── PulseHeatTreemap.tsx # D3 Treemap 热力图
        ├── PulseCard.tsx       # 脉冲卡片
        ├── PulseDetailDialog.tsx # 详情弹窗
        ├── CategoryBar.tsx     # 类别过滤栏
        ├── TreemapTile.tsx     # Treemap 单元格
        ├── TreemapTooltip.tsx  # Treemap 提示框
        ├── TreemapVisualization.tsx # Treemap 渲染层
        ├── WorldMapBackground.tsx  # 背景动画
        ├── WorldMapSection.tsx # 地图区域组件
        ├── RecommendationCard.tsx  # 推荐卡片
        ├── MiniHeatChart.tsx   # 迷你热度图
        └── colorThemes.ts     # Treemap 色卡（Apple System Gray）
```

## 每日 Pipeline

通过 `POST /api/internal/gather-pulses`（需 `x-internal-secret` header）触发，使用 `waitUntil` 后台执行：

```
1. 采集 (gatherSignals.ts)
   → 调用所有注册的 DataSource
   → 写入 Pulse 表（category 直接写字符串）
   → processPulseIdentity: 按 (category + title) 匹配昨日脉冲，继承 heatScore/heatDelta

2. HEAT 计算 (heat/index.ts)
   → 并行 10 worker 处理每个 Pulse：
     gatherPosts → calculateHeat → 计算 delta → generateDescription
   → 帖子写入 pulse.extra.posts，错误写入 pulse.extra.error

3. 过期淘汰 (expiration/index.ts)
   → 按类别分组处理：
     保留: heatDelta === null（新）| heatDelta >= 0.1（热门）| Top 20（兜底）
     淘汰: 其余标记 expired = true
```

## 调用入口

### Internal API（Cronjob 用）

| 路由 | 作用 |
|------|------|
| `POST /api/internal/gather-pulses` | 完整每日 pipeline（采集 + HEAT + 过期） |

Header: `x-internal-secret: $INTERNAL_API_SECRET`，返回后立即 200，后台 `waitUntil` 执行。

### Admin Server Actions (`src/app/admin/pulses/actions.ts`)

在 `/admin/pulses` 页面使用，需要 `MANAGE_CONTENT` 权限：

| 方法 | 作用 |
|------|------|
| `triggerFullPipeline()` | **一键全流程**：采集 + HEAT + 过期（与 internal API 逻辑一致） |
| `getDistinctCategories()` | 获取所有类别及脉冲数量 |
| `getAllAvailableDataSources()` | 列出所有数据源（含工厂展开的） |
| `triggerDataSourceGathering(name)` | 触发指定数据源采集（支持 `"xTrend"` 或 `"xTrend:AI Tech"`） |
| `triggerAllDataSourcesGathering()` | 触发所有数据源采集 |
| `triggerHeatPipeline(category?, includeAlreadyScored?, onlyUnscored?, pulseIds?)` | 触发 HEAT 计算 |
| `triggerExpirationTest(category?, pulseIds?)` | 触发过期淘汰 |
| `getPulseStatistics()` | 统计总数、有热度数、过期数、最近 20 条 |
| `getXTrendCategoryConfig()` | 读取 xTrend 类别配置（SystemConfig） |
| `updateXTrendCategoryConfig(categories)` | 更新 xTrend 类别配置 |

### 核心模块函数（可直接调用）

| 函数 | 位置 |
|------|------|
| `runDailyPulsePipeline(logger?)` | `lib/runDailyPipeline.ts` — 完整 pipeline |
| `gatherPulsesForDataSource(name)` | `lib/gatherSignals.ts` — 单数据源采集 |
| `gatherPulsesFromAllDataSources()` | `lib/gatherSignals.ts` — 全部数据源采集 |
| `processHeatPipeline(pulseIds, logger?)` | `heat/index.ts` — HEAT 批处理 |
| `processExpirationTest(pulseIds, logger?)` | `expiration/index.ts` — 过期淘汰 |
| `recommendPulsesForActiveUsers(userIds?)` | `recommendation/index.ts` — 批量推荐 |
| `recommendPulsesForUser(userId)` | `recommendation/recommendPulses.ts` — 单用户推荐 |

## 多语言支持

每个 category 有独立的 `locale` 字段，决定这批 pulse 对应哪种语言的用户。前端按用户 locale 过滤展示。

**一次 pipeline（cronjob 或 admin "Run Full Pipeline"）会同时处理所有 category，中英文一起产生。** 不需要分开触发。

只需在 category config 里同时配置两种语言的 category 即可：

```json
[
  {"name": "AI Tech",    "query": "AI agents OR LLM OR Claude OR GPT", "locale": "en-US"},
  {"name": "AI 科技",    "query": "AI智能体 OR 大模型 OR Claude OR GPT", "locale": "zh-CN"}
]
```

## 冷启动

1. 在 `/admin/pulses` 页面的 **xTrend Category Config** 区域，粘贴类别配置（中英文 category 都加上）并保存。

2. 点击 **Run Full Pipeline** 按钮（或通过 internal API 触发）：
   ```bash
   curl -X POST http://localhost:3000/api/internal/gather-pulses \
     -H "x-internal-secret: $INTERNAL_API_SECRET"
   ```

3. 在 `/pulse` 页面验证。

## 配置

- `heat/config.ts` — HEAT 评分权重、并发 worker 数
- `expiration/config.ts` — delta 阈值（默认 0.1）、Top N（默认 20）
- `recommendation/config.ts` — 活跃天数（默认 30）、推荐数（默认 10）

## 相关文档

- [如何创建新数据源](./create-datasource.md)
