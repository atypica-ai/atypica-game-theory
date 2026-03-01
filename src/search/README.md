# Meilisearch 搜索模块

基于 Meilisearch 的全文搜索，支持：
- **Artifacts**：Reports 和 Podcasts
- **Personas**：AI 人设库
- **Projects**：Studies、Universal Agent、Interview Projects、Panels

## 快速开始

### 1. 配置环境变量

在 `.env.local` 添加：

```bash
# Meilisearch 配置
MEILISEARCH_HOST=https://your-instance.meilisearch.io
MEILISEARCH_API_KEY=your-api-key        # 运行时使用（搜索、文档读写）
MEILISEARCH_MASTER_KEY=your-master-key  # 仅管理脚本使用（创建索引）

# 索引名称配置（可选，默认值如下）
MEILISEARCH_INDEXES={"artifacts":"artifacts","personas":"personas","projects":"projects"}
```

### 2. API Key 权限配置

**两种 Key，职责分离：**

| Key | 环境变量 | 用途 | 使用场景 |
|-----|---------|------|---------|
| **API Key** | `MEILISEARCH_API_KEY` | 搜索、文档读写 | 运行时服务（Next.js 应用） |
| **Master Key** | `MEILISEARCH_MASTER_KEY` | 创建/删除索引、配置 settings、管理 Key | 仅 `scripts/admin/search-management.ts` |

**API Key 需要的权限（actions）：**

| 权限 | 说明 |
|------|------|
| `search` | 搜索索引 |
| `documents.add` | 添加/更新文档（同步数据时使用） |
| `documents.delete` | 删除文档 |
| `indexes.get` | 获取索引信息（检查索引是否存在） |
| `tasks.get` | 查询任务状态（等待同步任务完成） |

**API Key 需要的索引（indexes）：**

所有环境都需要配置对应的索引名称，例如：
- 生产：`["artifacts", "personas", "projects"]`
- 开发：`["artifacts-dev", "personas-dev", "projects-dev"]`

**获取 Meilisearch Cloud:**
1. 访问 https://www.meilisearch.com/cloud
2. 注册并创建项目
3. 在 Settings → API Keys 中获取 API Key 和 Master Key

**本地 Docker:**
```bash
docker run -d -p 7700:7700 \
  -e MEILI_MASTER_KEY="test-key" \
  getmeili/meilisearch:latest
# 本地开发时 API Key 和 Master Key 可以用同一个 test-key
```

### 3. 初始化

#### Artifacts（Reports + Podcasts）

```bash
pnpm tsx scripts/admin/search-management.ts init-artifacts
pnpm tsx scripts/admin/search-management.ts sync-artifacts
```

#### Personas

```bash
pnpm tsx scripts/admin/search-management.ts init-personas
pnpm tsx scripts/admin/search-management.ts sync-personas
```

#### Projects（Studies、Universal、Interview、Panel）

```bash
pnpm tsx scripts/admin/search-management.ts init-projects
pnpm tsx scripts/admin/search-management.ts sync-projects
pnpm tsx scripts/admin/search-management.ts sync-projects --filter '{"userId":2}'
pnpm tsx scripts/admin/search-management.ts sync-projects --limit 100
```

### 4. 使用

- **Artifacts 搜索**: http://localhost:3000/admin/studies/search
- **Personas 搜索**: Admin personas 页面

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

### Projects
- 全文搜索：title, description
- Type 过滤：study, universal, interview, panel
- UserId 过滤

## 常见问题

### 搜索没结果？

```bash
# 先初始化索引，再全量同步
pnpm tsx scripts/admin/search-management.ts init-artifacts && pnpm tsx scripts/admin/search-management.ts sync-artifacts
pnpm tsx scripts/admin/search-management.ts init-personas && pnpm tsx scripts/admin/search-management.ts sync-personas
pnpm tsx scripts/admin/search-management.ts init-projects && pnpm tsx scripts/admin/search-management.ts sync-projects
```

### 连接失败？

检查 `.env.local` 中的：
- `MEILISEARCH_HOST` 格式是否正确（需要 https:// 前缀）
- `MEILISEARCH_API_KEY` 是否正确（运行时搜索/文档操作）
- `MEILISEARCH_MASTER_KEY` 是否正确（仅管理脚本 init 命令需要）

## 文件结构

```
search/
├── README.md       # 本文档
├── actions.ts      # Server Actions
├── types.ts        # 类型定义
└── lib/
    ├── client.ts   # Meilisearch 客户端（runtime + admin）
    ├── sync.ts     # 数据同步（单条）
    └── queries.ts  # 搜索查询
```

## 索引结构

只存储搜索必需的字段，完整数据从数据库查询。

### Artifacts 索引

```typescript
{
  slug: "report-1" | "podcast-2",    // 主键（type-id）
  type: "report" | "podcast",        // 过滤
  title: string,                      // 搜索
  description: string,                // 搜索
  kind: string | null,                // 过滤（analystKind）
  isFeatured: boolean,                // 过滤
  userId: number,                     // 过滤
  teamId: number | null,              // 预留
  createdAt: timestamp                // 排序
}
```

### Personas 索引

```typescript
{
  slug: "persona-123",    // 主键（persona-{id}）
  name: string,           // 搜索
  tags: string[],         // 搜索
  prompt: string,         // 搜索（人设完整对话历史）
  tier: number,           // 过滤（0-3）
  locale: string,         // 过滤（zh-CN, en-US）
  userId: number | null,  // 过滤
  teamId: number | null,  // 预留
  createdAt: timestamp    // 排序
}
```

### Projects 索引

```typescript
{
  slug: "study-1" | "universal-2" | "interview-3" | "panel-4",  // 主键（type-id）
  type: "study" | "universal" | "interview" | "panel",           // 过滤
  title: string,         // 搜索（interview 为空）
  description: string,   // 搜索（study=studyTopic, interview=brief, panel=instruction, universal 为空）
  userId: number,        // 过滤
  teamId: number | null, // 预留
  createdAt: timestamp   // 排序
}
```

## 管理脚本

位置: `scripts/admin/search-management.ts`

所有同步命令支持 `--filter`（Prisma where JSON）和 `--limit`。

```bash
# Artifacts
pnpm tsx scripts/admin/search-management.ts sync-artifacts -f '{"userId":2}' -l 100
pnpm tsx scripts/admin/search-management.ts sync-artifacts --start-from-report-id 1900
pnpm tsx scripts/admin/search-management.ts sync-artifacts --only-reports

# Personas
pnpm tsx scripts/admin/search-management.ts sync-personas -f '{"tier":3}' -l 100
pnpm tsx scripts/admin/search-management.ts sync-personas --start-from-persona-id 1000

# Projects
pnpm tsx scripts/admin/search-management.ts sync-projects -f '{"userId":2}' -l 100
```

---

有问题查看 [Meilisearch 文档](https://www.meilisearch.com/docs)
