# Format Content API

将长文本内容格式化为结构化、美观的 HTML。

## 核心特性

- **智能缓存**：基于内容 hash，避免重复生成
- **自动等待**：检测到 processing 时自动轮询等待（最多 5 分钟）
- **前后端统一**：`formatContentCore` 函数处理所有场景
- **Limited Free**：当前免费使用，仅记录日志，不扣 tokens

## 架构说明

### 核心函数：`formatContentCore`

```typescript
const result = await formatContentCore(
  { content, locale, userId, triggeredBy: "frontend" | "backend", live: true },
  streamWriter?, // 可选：传入则流式输出
);
```

**返回状态**：
- `cached`: 有缓存，直接返回
- `processing`: 另一个实例正在处理（不等待，直接返回）
- `generated`: 生成完成（writer 已写入）
- `failed`: 生成失败

### API 路由：轮询逻辑

`route.ts` 循环调用 `formatContentCore`：
- `processing` → 等 5 秒，重新调用
- `cached` → writer 写缓存，结束
- `generated` → 直接结束（writer 已写入）
- `failed` → writer 写空，结束
- 超时（60 次）→ 放弃

### 缓存文件

```
.next/cache/sandbox/user/{userId}/workspace/format-content/
├── {hash}.json              # 缓存内容
└── {hash}.processing.json   # 处理中标记（完成后删除）
```

## 使用方式

### Frontend: React Hook

```tsx
import { useFormatContent } from '@/app/api/format-content';

const { formattedHtml, isLoading, formatContent } = useFormatContent({
  live: true, // live=true 会生成，live=false 只读缓存
});

await formatContent(longText);

// 渲染
<div dangerouslySetInnerHTML={{ __html: formattedHtml }} />
```

### Backend: 后台触发

```typescript
import { formatContentCore } from "@/app/api/format-content";
import { after } from "next/server";

// Agent 工具返回后触发（非阻塞）
after(
  formatContentCore({
    content: output.plainText,
    locale: context.locale,
    userId: context.userId,
    triggeredBy: "backend",
  }),
);
```

**触发时机**：Agent 工具返回 `plainText` 字段后，在 `onStepFinish` 里触发。

## Query 参数

- `?live=true` - 生成模式（会生成新内容）
- `?live=false` - Replay 模式（只读缓存，不生成）

## Token 计费

当前 **Limited Free** 模式：
- Token 使用仅记录日志
- 不扣除用户余额
- 不创建数据库记录

启用计费：替换 `statReport` 为 `initStudyStatReporter`（参考 `BACKEND_USAGE.md`）。

## 样式

生成的 HTML 使用 Tailwind CSS：
- 黑白为主，绿色 (#1bff1b) 装饰
- 紧凑布局、小圆角、响应式
- 自动适配亮色/暗色模式

支持：策略卡片、洞察卡片、统计卡片、表格、时间线等。
