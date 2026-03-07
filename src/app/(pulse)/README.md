# Pulse 功能模块

趋势脉冲发现和管理系统，用于收集、评分并向用户推荐脉冲。

## 架构

```
src/app/(pulse)/
├── dataSources/          # 从外部来源收集脉冲
│   ├── xTrend/          # 通过 Grok 获取 Twitter/X 趋势
│   └── index.ts         # 数据源注册表
├── lib/                 # 核心脉冲处理
│   ├── gatherSignals.ts        # 编排数据源收集
│   ├── processPulseIdentity.ts  # 身份修复和继承
│   └── assignExpiration.ts     # LLM 驱动的过期时间分配
├── heat/                # HEAT 评分计算管道
│   ├── index.ts         # 主管道（并行批处理）
│   ├── gatherPosts.ts   # 通过 Grok/x-search 获取帖子
│   ├── calculateHeat.ts # 从帖子计算 HEAT 分数
│   └── generateDescription.ts  # 生成脉冲描述
├── expiration/          # 脉冲过期逻辑
│   ├── index.ts         # 过期测试（增量阈值 + Top N）
│   └── config.ts        # 阈值和限制
├── recommendation/      # 用户推荐系统
│   ├── recommendPulses.ts # LLM 过滤 + 随机选择
│   └── config.ts        # 推荐参数
└── pulse/               # 前端市场
    ├── actions.ts       # 服务器操作（数据获取）
    ├── PulseMarketplaceClient.tsx # 主客户端组件
    └── components/      # UI 组件（树状图、卡片等）
```

**API 路由**: `src/app/api/internal/`
- `gather-pulses/route.ts` - 完整工作流编排器
- `calculate-heat/route.ts` - 仅 HEAT 计算
- `expire-pulses/route.ts` - 仅过期测试
- `recommend-pulses/route.ts` - 用户推荐

## 流程与模块关系

### 每日工作流（通过 `/api/internal/gather-pulses`）

```
1. 收集脉冲 (lib/gatherSignals.ts)
   └─> 对于每个数据源 (dataSources/xTrend/):
       ├─> 通过 Grok 收集原始脉冲
       ├─> 修复身份 (processPulseIdentity.ts)
       │   └─> 通过标题+类别匹配，继承热力分数
       └─> 分配过期时间 (assignExpiration.ts)
           └─> LLM 确定 expireAt (1-365 天)

2. 计算 HEAT (heat/index.ts)
   └─> 并行批处理（10 个并发）:
       ├─> 收集帖子 (gatherPosts.ts) - Grok + x-search
       ├─> 计算分数 (calculateHeat.ts) - HDI 风格公式
       ├─> 计算增量 - 与昨天脉冲的百分比变化
       └─> 生成描述 (generateDescription.ts)

3. 过期测试 (expiration/index.ts)
   └─> 按类别:
       ├─> 保留: 新脉冲 (heatDelta === null)
       ├─> 保留: 高于阈值 (heatDelta >= 0.1)
       ├─> 保留: 每类别 Top N (默认: 20)
       └─> 过期: 所有其他
```

### 独立模块

每个模块可通过专用 API 独立运行：

- **HEAT 计算**: `/api/internal/calculate-heat`
  - 支持: `pulseIds`, `categoryId`, `onlyUnscored=true`
  - 重试失败的脉冲: `POST { "pulseIds": [1, 2, 3] }`

- **过期测试**: `/api/internal/expire-pulses`
  - 支持: `pulseIds`, `categoryId`
  - 重试特定脉冲: `POST { "pulseIds": [1, 2, 3] }`

- **推荐**: `/api/internal/recommend-pulses`
  - 为活跃用户生成个性化推荐
  - 可配置: `userActiveDays`, `pulseFreshHours` 等

## 模块逻辑

### `dataSources/` - 脉冲收集
- **目的**: 从外部来源获取趋势主题
- **当前**: xTrend（通过 Grok 的 Twitter/X）
- **流程**: 类别查询 → Grok 搜索 → 解析脉冲 → 保存到数据库
- **关键文件**: `xTrend/gatherPulsesWithGrok.ts`, `lib/gatherSignals.ts`

### `lib/processPulseIdentity.ts` - 身份管理
- **目的**: 通过（类别 + 标题）匹配脉冲，继承热力分数
- **逻辑**: 语义相似度匹配，将 `heatScore`/`heatDelta` 转移到新脉冲
- **原因**: 同一主题每天出现，保留历史分数

### `heat/` - HEAT 分数管道
- **目的**: 计算参与度分数和趋势增量
- **流程**: 
  1. 通过 Grok/x-search 收集 10 个帖子
  2. 计算 HEAT: `(reach_index^0.6 × intensity_index^0.4) × 1000`
  3. 计算增量: `(今日分数 - 昨日分数) / 昨日分数`
  4. 从帖子生成描述
- **并行**: 并发处理 10 个脉冲（配置: `HEAT_CONFIG.MAX_WORKERS`）
- **错误处理**: 在 `pulse.extra.error` 字段中记录错误

### `expiration/` - 过期逻辑
- **目的**: 仅保留相关脉冲，过期过时的脉冲
- **规则**（按类别）:
  - ✅ 保留: 新脉冲 (`heatDelta === null`)
  - ✅ 保留: 高于阈值 (`heatDelta >= 0.1`)
  - ✅ 保留: Top N (`heatDelta` 降序，默认: 20）
  - ❌ 过期: 所有其他
- **配置**: `expiration/config.ts`（阈值、Top N 限制）

### `recommendation/` - 用户推荐
- **目的**: 个性化脉冲推荐
- **流程**:
  1. 加载用户记忆（如果存在）
  2. 查询新鲜脉冲（最近 24 小时）
  3. 过滤: LLM 过滤（有记忆的用户）或随机（新用户）
  4. 生成角度: 为什么这个脉冲相关
  5. 存储: `UserPulseRecommendation` 记录
- **配置**: `recommendation/config.ts`

### `pulse/` - 前端市场
- **目的**: 面向用户的脉冲浏览和发现
- **组件**:
  - `PulseHeatTreemap.tsx` - 热力图可视化（D3 树状图）
  - `PulseCard.tsx` - 单个脉冲卡片
  - `CategoryBar.tsx` - 类别过滤
- **数据流**: 服务器操作 → SWR → 客户端组件
- **排序**: 正增量 → 新 → 零/负（见 `utils/sorting.ts`）

## 冷启动与维护

### 冷启动

1. **初始设置**:
   ```bash
   # 确保类别存在（通过管理面板或直接数据库）
   # 类别需要: name, query（用于 xTrend）
   ```

2. **首次运行**:
   ```bash
   # 触发完整工作流
   curl -X POST https://your-domain/api/internal/gather-pulses \
     -H "x-internal-secret: $INTERNAL_API_SECRET"
   ```

3. **验证**:
   - 检查日志中的脉冲计数
   - 验证数据库中的脉冲具有 `heatScore` 和 `heatDelta`
   - 检查市场 UI: `/pulse`

### Cronjob 设置

**推荐计划**（每日）:

```bash
# 主工作流（收集 + 热力 + 过期）
0 2 * * * curl -X POST https://your-domain/api/internal/gather-pulses \
  -H "x-internal-secret: $INTERNAL_API_SECRET"

# 用户推荐（脉冲准备就绪后）
0 3 * * * curl -X POST https://your-domain/api/internal/recommend-pulses \
  -H "x-internal-secret: $INTERNAL_API_SECRET"
```

**替代方案**: 使用 Vercel Cron（见 `vercel.json`）或外部调度器。

### 维护操作

**重试失败的 HEAT 计算**:
```bash
# 处理所有未评分的脉冲
curl -X POST "https://your-domain/api/internal/calculate-heat?onlyUnscored=true" \
  -H "x-internal-secret: $INTERNAL_API_SECRET"

# 重试特定脉冲 ID
curl -X POST https://your-domain/api/internal/calculate-heat \
  -H "x-internal-secret: $INTERNAL_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"pulseIds": [123, 456, 789]}'
```

**重试过期测试**:
```bash
# 重试特定脉冲
curl -X POST https://your-domain/api/internal/expire-pulses \
  -H "x-internal-secret: $INTERNAL_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"pulseIds": [123, 456, 789]}'
```

**检查失败的脉冲**:
```sql
-- 没有热力分数的脉冲（检查 extra.error 了解详情）
SELECT id, title, "categoryId", extra->>'error' as error
FROM "Pulse"
WHERE "heatScore" IS NULL
  AND "createdAt" > NOW() - INTERVAL '7 days';
```

## 配置

- **HEAT**: `heat/config.ts` - 评分权重、阈值
- **过期**: `expiration/config.ts` - 增量阈值、Top N 限制
- **推荐**: `recommendation/config.ts` - 用户活动窗口、限制
- **数据源**: `dataSources/index.ts` - 可用源注册表

## 核心概念

- **HEAT 分数**: 基于浏览量和互动的参与度指标（0-1000）
- **HEAT 增量**: 与昨天脉冲的百分比变化（小数，例如 0.2 = +20%）
- **身份**: 具有相同（类别 + 标题）的脉冲被视为同一主题
- **继承**: 新脉冲从前一天的版本继承热力分数
- **过期**: 自动清理低性能脉冲

## 相关文档

- **API 测试**: `docs/howto/test-pulse-apis.md` - 详细的 API 示例
- **组件详情**: `pulse/components/README.md` - 前端组件文档
- **数据库架构**: 查看 Prisma schema 中的 `Pulse`, `PulseCategory`, `UserPulseRecommendation`

---

# Pulse Feature

Trending pulse discovery and management system that gathers, scores, and recommends pulses to users.

## Architecture

```
src/app/(pulse)/
├── dataSources/          # Pulse gathering from external sources
│   ├── xTrend/          # Twitter/X trends via Grok
│   └── index.ts        # DataSource registry
├── lib/                 # Core pulse processing
│   ├── gatherSignals.ts        # Orchestrates dataSource gathering
│   ├── processPulseIdentity.ts # Identity fixing & carry-over
│   └── assignExpiration.ts     # LLM-powered expiration assignment
├── heat/                # HEAT score calculation pipeline
│   ├── index.ts        # Main pipeline (parallel batch processing)
│   ├── gatherPosts.ts  # Fetch posts via Grok/x-search
│   ├── calculateHeat.ts # Calculate HEAT score from posts
│   └── generateDescription.ts # Generate pulse description
├── expiration/          # Pulse expiration logic
│   ├── index.ts        # Expiration test (delta threshold + top N)
│   └── config.ts       # Thresholds and limits
├── recommendation/      # User recommendation system
│   ├── recommendPulses.ts # LLM filtering + random selection
│   └── config.ts       # Recommendation parameters
└── pulse/               # Frontend marketplace
    ├── actions.ts       # Server actions (data fetching)
    ├── PulseMarketplaceClient.tsx # Main client component
    └── components/       # UI components (treemap, cards, etc.)
```

**API Routes**: `src/app/api/internal/`
- `gather-pulses/route.ts` - Full workflow orchestrator
- `calculate-heat/route.ts` - HEAT calculation only
- `expire-pulses/route.ts` - Expiration test only
- `recommend-pulses/route.ts` - User recommendations

## Flow & Module Relations

### Daily Workflow (via `/api/internal/gather-pulses`)

```
1. Gather Pulses (lib/gatherSignals.ts)
   └─> For each dataSource (dataSources/xTrend/):
       ├─> Gather raw pulses via Grok
       ├─> Fix identity (processPulseIdentity.ts)
       │   └─> Match by title+category, carry-over heat scores
       └─> Assign expiration (assignExpiration.ts)
           └─> LLM determines expireAt (1-365 days)

2. Calculate HEAT (heat/index.ts)
   └─> Parallel batch processing (10 concurrent):
       ├─> Gather posts (gatherPosts.ts) - Grok + x-search
       ├─> Calculate score (calculateHeat.ts) - HDI-style formula
       ├─> Calculate delta - % change vs yesterday's pulse
       └─> Generate description (generateDescription.ts)

3. Expiration Test (expiration/index.ts)
   └─> Per category:
       ├─> Keep: new pulses (heatDelta === null)
       ├─> Keep: above threshold (heatDelta >= 0.1)
       ├─> Keep: top N per category (default: 20)
       └─> Expire: all others
```

### Independent Modules

Each module can run independently via dedicated APIs:

- **HEAT Calculation**: `/api/internal/calculate-heat`
  - Supports: `pulseIds`, `categoryId`, `onlyUnscored=true`
  - Retry failed pulses: `POST { "pulseIds": [1, 2, 3] }`

- **Expiration Test**: `/api/internal/expire-pulses`
  - Supports: `pulseIds`, `categoryId`
  - Retry specific pulses: `POST { "pulseIds": [1, 2, 3] }`

- **Recommendations**: `/api/internal/recommend-pulses`
  - Generates personalized recommendations for active users
  - Configurable: `userActiveDays`, `pulseFreshHours`, etc.

## Module Logic

### `dataSources/` - Pulse Gathering
- **Purpose**: Fetch trending topics from external sources
- **Current**: xTrend (Twitter/X via Grok)
- **Flow**: Category query → Grok search → Parse pulses → Save to DB
- **Key Files**: `xTrend/gatherPulsesWithGrok.ts`, `lib/gatherSignals.ts`

### `lib/processPulseIdentity.ts` - Identity Management
- **Purpose**: Match pulses by (category + title), carry-over heat scores
- **Logic**: Semantic similarity matching, transfers `heatScore`/`heatDelta` to new pulse
- **Why**: Same topic appears daily, preserve historical scores

### `heat/` - HEAT Score Pipeline
- **Purpose**: Calculate engagement score and trend delta
- **Flow**: 
  1. Gather 10 posts via Grok/x-search
  2. Calculate HEAT: `(reach_index^0.6 × intensity_index^0.4) × 1000`
  3. Calculate delta: `(today_score - yesterday_score) / yesterday_score`
  4. Generate description from posts
- **Parallel**: Processes 10 pulses concurrently (config: `HEAT_CONFIG.MAX_WORKERS`)
- **Error Handling**: Records errors in `pulse.extra.error` field

### `expiration/` - Expiration Logic
- **Purpose**: Keep only relevant pulses, expire stale ones
- **Rules** (per category):
  - ✅ Keep: New pulses (`heatDelta === null`)
  - ✅ Keep: Above threshold (`heatDelta >= 0.1`)
  - ✅ Keep: Top N (`heatDelta` descending, default: 20)
  - ❌ Expire: All others
- **Config**: `expiration/config.ts` (thresholds, top N limits)

### `recommendation/` - User Recommendations
- **Purpose**: Personalized pulse recommendations
- **Flow**:
  1. Load user memory (if exists)
  2. Query fresh pulses (last 24h)
  3. Filter: LLM filtering (users with memory) OR random (new users)
  4. Generate angles: Why this pulse is relevant
  5. Store: `UserPulseRecommendation` record
- **Config**: `recommendation/config.ts`

### `pulse/` - Frontend Marketplace
- **Purpose**: User-facing pulse browsing and discovery
- **Components**:
  - `PulseHeatTreemap.tsx` - Heatmap visualization (D3 treemap)
  - `PulseCard.tsx` - Individual pulse cards
  - `CategoryBar.tsx` - Category filtering
- **Data Flow**: Server actions → SWR → Client components
- **Sorting**: Positive delta → New → Zero/Negative (see `utils/sorting.ts`)

## Cold Start & Maintenance

### Cold Start

1. **Initial Setup**:
   ```bash
   # Ensure categories exist (via admin panel or direct DB)
   # Categories need: name, query (for xTrend)
   ```

2. **First Run**:
   ```bash
   # Trigger full workflow
   curl -X POST https://your-domain/api/internal/gather-pulses \
     -H "x-internal-secret: $INTERNAL_API_SECRET"
   ```

3. **Verify**:
   - Check logs for pulse counts
   - Verify pulses in DB have `heatScore` and `heatDelta`
   - Check marketplace UI: `/pulse`

### Cronjob Setup

**Recommended Schedule** (daily):

```bash
# Main workflow (gather + heat + expiration)
0 2 * * * curl -X POST https://your-domain/api/internal/gather-pulses \
  -H "x-internal-secret: $INTERNAL_API_SECRET"

# User recommendations (after pulses are ready)
0 3 * * * curl -X POST https://your-domain/api/internal/recommend-pulses \
  -H "x-internal-secret: $INTERNAL_API_SECRET"
```

**Alternative**: Use Vercel Cron (see `vercel.json`) or external scheduler.

### Maintenance Operations

**Retry Failed HEAT Calculations**:
```bash
# Process all unscored pulses
curl -X POST "https://your-domain/api/internal/calculate-heat?onlyUnscored=true" \
  -H "x-internal-secret: $INTERNAL_API_SECRET"

# Retry specific pulse IDs
curl -X POST https://your-domain/api/internal/calculate-heat \
  -H "x-internal-secret: $INTERNAL_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"pulseIds": [123, 456, 789]}'
```

**Retry Expiration Test**:
```bash
# Retry specific pulses
curl -X POST https://your-domain/api/internal/expire-pulses \
  -H "x-internal-secret: $INTERNAL_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"pulseIds": [123, 456, 789]}'
```

**Check Failed Pulses**:
```sql
-- Pulses without heat scores (check extra.error for details)
SELECT id, title, categoryId, extra->>'error' as error
FROM "Pulse"
WHERE "heatScore" IS NULL
  AND "createdAt" > NOW() - INTERVAL '7 days';
```

## Configuration

- **HEAT**: `heat/config.ts` - Scoring weights, thresholds
- **Expiration**: `expiration/config.ts` - Delta thresholds, top N limits
- **Recommendation**: `recommendation/config.ts` - User activity windows, limits
- **Data Sources**: `dataSources/index.ts` - Registry of available sources

## Key Concepts

- **HEAT Score**: Engagement metric (0-1000) based on views and interactions
- **HEAT Delta**: Percentage change vs yesterday's pulse (decimal, e.g., 0.2 = +20%)
- **Identity**: Pulses with same (category + title) are considered same topic
- **Carry-Over**: New pulse inherits heat score from previous day's version
- **Expiration**: Automatic cleanup of low-performing pulses

## Related Documentation

- **API Testing**: `docs/howto/test-pulse-apis.md` - Detailed API examples
- **Component Details**: `pulse/components/README.md` - Frontend component docs
- **Database Schema**: See Prisma schema for `Pulse`, `PulseCategory`, `UserPulseRecommendation`
