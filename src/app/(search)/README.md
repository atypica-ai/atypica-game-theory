# Artifacts 搜索模块

基于 Meilisearch 的全文搜索，支持 Reports 和 Podcasts。

## 快速开始

### 1. 配置环境变量

在 `.env.local` 添加：

```bash
# Meilisearch 配置
MEILISEARCH_HOST=https://your-instance.meilisearch.io
MEILISEARCH_MASTER_KEY=your-master-key

# 索引名称配置（可选，默认值如下）
MEILISEARCH_INDEXES={"artifacts":"artifacts"}
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

```bash
pnpm tsx scripts/admin/search-management.ts init   # 创建索引
pnpm tsx scripts/admin/search-management.ts sync   # 同步数据

# 带过滤条件同步
pnpm tsx scripts/admin/search-management.ts sync --filter '{"userId":2}'

# 限制同步数量
pnpm tsx scripts/admin/search-management.ts sync --limit 100

# 断点续传：从指定 ID 继续同步
pnpm tsx scripts/admin/search-management.ts sync --start-from-report-id 1900

# 只同步 reports 或 podcasts
pnpm tsx scripts/admin/search-management.ts sync --only-reports
pnpm tsx scripts/admin/search-management.ts sync --only-podcasts

# 组合使用
pnpm tsx scripts/admin/search-management.ts sync -f '{"userId":2}' -l 100
```

### 3. 使用

访问: http://localhost:3000/admin/studies/search

## 自动同步

Report 和 Podcast 生成后会**自动同步**到 Meilisearch，无需手动操作。

## 搜索功能

- 全文搜索（标题、描述）
- 类型过滤（Report/Podcast）
- Kind 过滤（analystKind，可选）

## 常见问题

### 搜索没结果？

```bash
pnpm tsx scripts/admin/search-management.ts init   # 重新初始化
pnpm tsx scripts/admin/search-management.ts sync   # 重新同步数据
```

### 连接失败？

检查 `.env.local` 中的：
- `MEILISEARCH_HOST` 格式是否正确（需要 https:// 前缀）
- `MEILISEARCH_MASTER_KEY` 是否正确

### 数据不同步？

```bash
pnpm tsx scripts/admin/search-management.ts sync   # 全量同步
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

只存储搜索必需的字段，完整数据从数据库查询：

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

## 扩展

需要添加 Personas 搜索时，参考本模块的实现即可。

## 管理脚本

位置: `scripts/admin/search-management.ts`

### 基本用法

```bash
# 初始化索引
pnpm tsx scripts/admin/search-management.ts init

# 全量同步
pnpm tsx scripts/admin/search-management.ts sync

# 同步特定用户的数据
pnpm tsx scripts/admin/search-management.ts sync --filter '{"userId":2}'

# 限制同步数量（每种类型最多 100 条）
pnpm tsx scripts/admin/search-management.ts sync --limit 100

# 组合使用（同步用户 2 的前 50 条记录）
pnpm tsx scripts/admin/search-management.ts sync -f '{"userId":2}' -l 50
```

### 断点续传

大数据量同步时如果中断，可以从指定 ID 继续：

```bash
# 从 report ID 1900 继续同步（查询条件：id > 1900）
pnpm tsx scripts/admin/search-management.ts sync --start-from-report-id 1900

# 从 podcast ID 500 继续同步
pnpm tsx scripts/admin/search-management.ts sync --start-from-podcast-id 500

# 同时指定两个起点
pnpm tsx scripts/admin/search-management.ts sync \
  --start-from-report-id 1900 \
  --start-from-podcast-id 500
```

**如何确定续传起点：**

脚本会输出每批次的 ID 范围，例如：
```
Report IDs fetched: count=5874, firstId=1, lastId=5874
Report batch synced: batchNumber=191, totalBatches=196, batchSize=30, totalSynced=5730
```

如果在 batch 191 失败，可以从 lastId 继续：
```bash
pnpm tsx scripts/admin/search-management.ts sync --start-from-report-id 5730
```

### 选择性同步

```bash
# 只同步 reports（跳过 podcasts）
pnpm tsx scripts/admin/search-management.ts sync --only-reports

# 只同步 podcasts（跳过 reports）
pnpm tsx scripts/admin/search-management.ts sync --only-podcasts

# 组合使用：只同步 reports，从 ID 1900 开始
pnpm tsx scripts/admin/search-management.ts sync --only-reports --start-from-report-id 1900
```

### 批量处理说明

同步采用**两阶段批量处理**，避免大数据集的内存溢出和超时：

1. **阶段 1**：只查询 ID（按 ID 升序）
2. **阶段 2**：每 30 个 ID 一批，并行获取完整数据 + featured 状态，然后同步到 Meilisearch

优势：
- 内存占用小（第一阶段只查 ID）
- 支持断点续传（按 ID 升序）
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
