# Meilisearch 搜索模块

基于 Meilisearch 的全文搜索，支持：
- **Artifacts**：Reports 和 Podcasts
- **Personas**：AI 人设库

## 快速开始

### 1. 配置环境变量

在 `.env.local` 添加：

```bash
# Meilisearch 配置
MEILISEARCH_HOST=https://your-instance.meilisearch.io
MEILISEARCH_MASTER_KEY=your-master-key

# 索引名称配置（可选，默认值如下）
MEILISEARCH_INDEXES={"artifacts":"artifacts","personas":"personas"}
```

**获取 Meilisearch Cloud:**
1. 访问 https://www.meilisearch.com/cloud
2. 注册并创建项目
3. 复制 Host 和 Master Key

**本地 Docker:**
```bash
docker run -d -p 7700:7700 \
  -e MEILI_MASTER_KEY="test-key" \
  getmeili/meilisearch:latest
```

### 2. 初始化

#### Artifacts（Reports + Podcasts）

```bash
# 创建索引
pnpm tsx scripts/admin/search-management.ts init-artifacts

# 同步数据
pnpm tsx scripts/admin/search-management.ts sync-artifacts

# 带过滤条件同步
pnpm tsx scripts/admin/search-management.ts sync-artifacts --filter '{"userId":2}'

# 限制同步数量
pnpm tsx scripts/admin/search-management.ts sync-artifacts --limit 100

# 断点续传：从指定 ID 继续同步
pnpm tsx scripts/admin/search-management.ts sync-artifacts --start-from-report-id 1900

# 只同步 reports 或 podcasts
pnpm tsx scripts/admin/search-management.ts sync-artifacts --only-reports
pnpm tsx scripts/admin/search-management.ts sync-artifacts --only-podcasts

# 组合使用
pnpm tsx scripts/admin/search-management.ts sync-artifacts -f '{"userId":2}' -l 100
```

#### Personas

```bash
# 创建索引
pnpm tsx scripts/admin/search-management.ts init-personas

# 同步数据
pnpm tsx scripts/admin/search-management.ts sync-personas

# 带过滤条件同步
pnpm tsx scripts/admin/search-management.ts sync-personas --filter '{"tier":3}'

# 限制同步数量
pnpm tsx scripts/admin/search-management.ts sync-personas --limit 100

# 断点续传：从指定 ID 继续同步
pnpm tsx scripts/admin/search-management.ts sync-personas --start-from-persona-id 1000

# 组合使用
pnpm tsx scripts/admin/search-management.ts sync-personas -f '{"tier":3}' -l 100
```

### 3. 使用

- **Artifacts 搜索**: http://localhost:3000/admin/studies/search
- **Personas 搜索**: Admin personas 页面（使用新的 Meilisearch 搜索）

## 自动同步

- **Report 和 Podcast** 生成后会**自动同步**到 Meilisearch，无需手动操作
- **Persona** 创建/更新后需要手动同步（或实现自动同步钩子）

## 搜索功能

### Artifacts（Reports + Podcasts）
- 全文搜索：title, description, kind
- 类型过滤：Report/Podcast
- Kind 过滤：analystKind
- Featured 过滤：isFeatured

### Personas
- 全文搜索：name, tags, prompt（人设完整对话历史）
- Tier 过滤：0-3
- Locale 过滤：zh-CN, en-US

## 常见问题

### 搜索没结果？

```bash
# Artifacts
pnpm tsx scripts/admin/search-management.ts init-artifacts
pnpm tsx scripts/admin/search-management.ts sync-artifacts

# Personas
pnpm tsx scripts/admin/search-management.ts init-personas
pnpm tsx scripts/admin/search-management.ts sync-personas
```

### 连接失败？

检查 `.env.local` 中的：
- `MEILISEARCH_HOST` 格式是否正确（需要 https:// 前缀）
- `MEILISEARCH_MASTER_KEY` 是否正确

### 数据不同步？

```bash
# 全量同步 Artifacts
pnpm tsx scripts/admin/search-management.ts sync-artifacts

# 全量同步 Personas
pnpm tsx scripts/admin/search-management.ts sync-personas
```

## 文件结构

```
(search)/
├── README.md       # 本文档
├── actions.ts      # Server Actions
├── types.ts        # 类型定义
└── lib/
    ├── client.ts   # Meilisearch 客户端
    ├── sync.ts     # 数据同步
    └── queries.ts  # 搜索查询
```

## 索引结构

只存储搜索必需的字段，完整数据从数据库查询。

### Artifacts 索引

```typescript
{
  slug: "report-1" | "podcast-2",    // 主键，用于数据库查询（格式：type-id）
  type: "report" | "podcast",        // 过滤
  title: string,                      // 搜索
  description: string,                // 搜索
  kind: string | null,                // 过滤（analystKind，可能为空）
  isFeatured: boolean,                // 过滤（是否为精选内容）
  createdAt: timestamp                // 排序
}
```

### Personas 索引

```typescript
{
  slug: "persona-123",    // 主键，用于数据库查询（格式：persona-{id}）
  name: string,           // 搜索
  tags: string[],         // 搜索、过滤
  prompt: string,         // 搜索（人设完整对话历史，重要）
  tier: number,           // 过滤（0-3）
  locale: string,         // 过滤（zh-CN, en-US）
  createdAt: timestamp    // 排序
}
```

## 管理脚本

位置: `scripts/admin/search-management.ts`

### Artifacts 同步

#### 基本用法

```bash
# 初始化索引
pnpm tsx scripts/admin/search-management.ts init-artifacts

# 全量同步
pnpm tsx scripts/admin/search-management.ts sync-artifacts

# 同步特定用户的数据
pnpm tsx scripts/admin/search-management.ts sync-artifacts --filter '{"userId":2}'

# 限制同步数量（每种类型最多 100 条）
pnpm tsx scripts/admin/search-management.ts sync-artifacts --limit 100

# 组合使用（同步用户 2 的前 50 条记录）
pnpm tsx scripts/admin/search-management.ts sync-artifacts -f '{"userId":2}' -l 50
```

#### 断点续传

大数据量同步时如果中断，可以从指定 ID 继续：

```bash
# 从 report ID 1900 继续同步（查询条件：id > 1900）
pnpm tsx scripts/admin/search-management.ts sync-artifacts --start-from-report-id 1900

# 从 podcast ID 500 继续同步
pnpm tsx scripts/admin/search-management.ts sync-artifacts --start-from-podcast-id 500

# 同时指定两个起点
pnpm tsx scripts/admin/search-management.ts sync-artifacts \
  --start-from-report-id 1900 \
  --start-from-podcast-id 500
```

**如何确定续传起点：**

脚本会输出每批次的 ID 范围和 lastProcessedId，例如：
```
Report batch synced: batchNumber=191, totalBatches=196, batchSize=30, totalSynced=5730, lastProcessedId=5855
```

从 lastProcessedId 继续：
```bash
pnpm tsx scripts/admin/search-management.ts sync-artifacts --start-from-report-id 5855
```

#### 选择性同步

```bash
# 只同步 reports（跳过 podcasts）
pnpm tsx scripts/admin/search-management.ts sync-artifacts --only-reports

# 只同步 podcasts（跳过 reports）
pnpm tsx scripts/admin/search-management.ts sync-artifacts --only-podcasts

# 组合使用：只同步 reports，从 ID 1900 开始
pnpm tsx scripts/admin/search-management.ts sync-artifacts --only-reports --start-from-report-id 1900
```

### Personas 同步

#### 基本用法

```bash
# 初始化索引
pnpm tsx scripts/admin/search-management.ts init-personas

# 全量同步
pnpm tsx scripts/admin/search-management.ts sync-personas

# 同步特定 tier 的数据
pnpm tsx scripts/admin/search-management.ts sync-personas --filter '{"tier":3}'

# 限制同步数量
pnpm tsx scripts/admin/search-management.ts sync-personas --limit 100

# 组合使用
pnpm tsx scripts/admin/search-management.ts sync-personas -f '{"tier":3}' -l 100
```

#### 断点续传

```bash
# 从 persona ID 1000 继续同步（查询条件：id > 1000）
pnpm tsx scripts/admin/search-management.ts sync-personas --start-from-persona-id 1000
```

脚本会输出 lastProcessedId 用于续传：
```
Persona batch synced: batchNumber=10, totalBatches=20, batchSize=30, totalSynced=300, lastProcessedId=1234
```

### 批量处理说明

所有同步操作采用**两阶段批量处理**，避免大数据集的内存溢出和超时：

1. **阶段 1**：只查询 ID（按 ID 升序）
2. **阶段 2**：每 30 个 ID 一批，并行获取完整数据，然后同步到 Meilisearch

优势：
- 内存占用小（第一阶段只查 ID）
- 支持断点续传（按 ID 升序，输出 lastProcessedId）
- 批次大小（30）经过优化，避免超时

### 过滤条件说明

`--filter` 参数接受 JSON 格式的 Prisma where 条件，支持所有 Prisma 查询语法：

```bash
# 按用户 ID 过滤
--filter '{"userId":2}'

# 按团队 ID 过滤
--filter '{"teamId":5}'

# 按时间范围过滤
--filter '{"createdAt":{"gte":"2024-01-01T00:00:00Z"}}'

# 组合条件
--filter '{"userId":2,"createdAt":{"gte":"2024-01-01T00:00:00Z"}}'
```

---

有问题查看 [Meilisearch 文档](https://www.meilisearch.com/docs)
