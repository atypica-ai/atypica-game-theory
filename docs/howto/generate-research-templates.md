# Generate Research Templates

为 Scout Agent 生成 AI 研究模板的内部流程，支持公共模板和个人模板。

## 功能说明

研究模板用于 `/newstudy` 页面的快捷启动卡片：

- **公共模板**：通过 AI 生成 12 个通用研究场景，覆盖 6 个目标角色
- **个人模板**：基于用户 Memory 和研究历史（studyLog）生成 6-12 个个性化模板
- 模板数据存储在 `ResearchTemplate` 表，包含 title、description、tags、category
- 使用统计（useCount）记录在 `extra` JSON 字段中

## 实现方式

### 1. 内部 API（生成公共模板）

- 路径：`POST /api/internal/generate-research-templates`
- 认证：`x-internal-secret` header
- 用途：批量生成或更新公共模板

### 2. 代码调用（生成个人模板）

```typescript
import { generatePersonalTemplates, checkAndGeneratePersonalTemplates } from "@/app/(newStudy)/lib/template";

// 直接生成个人模板
await generatePersonalTemplates(userId, locale);

// 或检查条件后自动生成
await checkAndGeneratePersonalTemplates(userId, locale);
```

## 参数配置

### API 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `locale` | `"zh-CN"` \| `"en-US"` | `"zh-CN"` | 生成模板的语言 |
| `replaceExisting` | `boolean` | `false` | 是否删除现有公共模板后重新生成 |
| `dryRun` | `boolean` | `false` | 测试模式，生成但不保存到数据库 |

### 个人模板生成条件

`checkAndGeneratePersonalTemplates` 自动判断是否生成：
- 用户没有个人模板
- 且满足以下条件之一：
  - 至少有 3 个研究（Analyst）
  - 有 Memory 记录

## 测试

### 生成公共模板（基础）

```bash
curl -X POST \
  -H "x-internal-secret: ${INTERNAL_API_SECRET}" \
  http://localhost:3000/api/internal/generate-research-templates
```

### 生成公共模板（指定语言）

```bash
curl -X POST \
  -H "x-internal-secret: ${INTERNAL_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "locale": "en-US"
  }' \
  http://localhost:3000/api/internal/generate-research-templates
```

### 替换现有公共模板

```bash
curl -X POST \
  -H "x-internal-secret: ${INTERNAL_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "locale": "zh-CN",
    "replaceExisting": true
  }' \
  http://localhost:3000/api/internal/generate-research-templates
```

### DryRun 模式（查看生成内容但不保存）

```bash
curl -X POST \
  -H "x-internal-secret: ${INTERNAL_API_SECRET}" \
  -H "Content-Type: application/json" \
  -d '{
    "locale": "zh-CN",
    "dryRun": true
  }' \
  http://localhost:3000/api/internal/generate-research-templates
```

### 响应示例（正常模式）

```json
{
  "success": true,
  "locale": "zh-CN",
  "count": 12,
  "replaceExisting": false,
  "message": "Successfully generated and saved 12 templates",
  "timestamp": "2024-01-10T12:00:00.000Z"
}
```

### 响应示例（DryRun 模式）

```json
{
  "success": true,
  "locale": "zh-CN",
  "dryRun": true,
  "count": 12,
  "templates": [
    {
      "title": "🏕️ 露营装备的使用场景创新",
      "description": "观察小红书上年轻人的露营玩法...",
      "tags": ["社交观察", "焦点小组", "生成报告"],
      "category": "product-testing"
    }
    // ... 11 more
  ],
  "message": "Dry run: generated 12 templates (not saved)",
  "timestamp": "2024-01-10T12:00:00.000Z"
}
```

## 生成个人模板

### 使用 tsx 脚本

创建 `scripts/generate-personal-templates.ts`：

```typescript
import { generatePersonalTemplates } from "@/app/(newStudy)/lib/template";
import { config } from "dotenv";
config();

const userId = 123; // 替换为实际用户 ID
const locale = "zh-CN";

generatePersonalTemplates(userId, locale)
  .then((count) => console.log(`✅ Generated ${count} personal templates`))
  .catch(console.error);
```

运行：
```bash
pnpm tsx scripts/generate-personal-templates.ts
```

### 在代码中调用

```typescript
// 示例：用户完成第 3 个研究后自动生成个人模板
async function onStudyCompleted(userId: number, locale: Locale) {
  const studyCount = await prisma.analyst.count({ where: { userId } });

  if (studyCount === 3) {
    await checkAndGeneratePersonalTemplates(userId, locale);
  }
}
```

## 前端集成

### 读取模板

```typescript
import { getResearchTemplates } from "@/app/(newStudy)/newstudy/actions";

const result = await getResearchTemplates(locale, userId);
// 返回个人模板 + 公共模板，限制 12 个
```

### 记录使用统计

```typescript
import { trackTemplateUsage } from "@/app/(newStudy)/newstudy/actions";

// 用户基于模板发起研究时
await trackTemplateUsage(templateId);

// 同时在 UserChat.extra 记录来源
await prisma.userChat.create({
  data: {
    // ... other fields
    extra: {
      researchTemplateId: templateId
    }
  }
});
```

## 使用场景

### 公共模板
- **初始化**：新部署时生成中英文各 12 个公共模板
- **更新**：定期（如每月）刷新公共模板内容，保持新鲜感
- **测试**：使用 dryRun 检查生成质量

### 个人模板
- **首次生成**：用户完成 3 个研究或有 Memory 时自动生成
- **定期刷新**：每完成 5 个研究，刷新一次个人模板
- **手动触发**：提供"刷新个性化模板"按钮

## 注意事项

### 缓存管理
- 公共模板生成使用 `generateAIShortcuts`，有 1 天缓存
- `replaceExisting=true` 时会自动清除缓存 (`revalidateTag("ai-generated-shortcuts")`)
- 避免在删除后立即调用，可能返回缓存数据

### 所有权
- `userId = null && teamId = null` → 公共模板
- `userId != null` → 个人模板
- `teamId != null` → 团队模板（未来扩展）
- 虽然 schema 允许同时设置，但业务层确保互斥

### 生成时间
- 公共模板：12 个模板约 15-30 秒（AI 生成）
- 个人模板：6-12 个模板约 10-25 秒（基于用户数据）
- DryRun 模式时间相同，只是跳过数据库写入

### 数据迁移
- Migration: `20260110124122_add_research_template_table`
- 运行 `npx prisma migrate deploy` 应用到生产环境
- 生成 Prisma Client: `npx prisma generate`

就这样。
