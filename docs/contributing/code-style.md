# 代码风格指南

本文档介绍 atypica.AI 项目的代码风格规范和最佳实践。

## 概述

项目使用严格的代码质量标准，确保代码的一致性、可维护性和可读性。

## 工具配置

### ESLint

**配置**: `.eslintrc.json`

```bash
# 检查代码（零警告容忍）
pnpm lint

# 自动修复
pnpm lint:fix
```

**规则**:
- 继承 Next.js 推荐配置
- **零警告容忍**: `--max-warnings 0`
- TypeScript 严格模式

### Prettier

**配置**: `.prettierrc`

```bash
# 格式化代码
pnpm format
```

**规则**:
- 支持的文件类型：`**/*.{ts,tsx,md}`
- 自动格式化导入、换行、缩进

### TypeScript

**配置**: `tsconfig.json`

- 严格模式启用
- Path 别名：`@/*` → `src/*`
- 完整的类型检查

## TypeScript 规范

### 类型导入

✅ **正确**:
```typescript
import type { User, Persona } from "@/prisma/client";
import type { ReactNode } from "react";
```

❌ **错误**:
```typescript
import { User } from "@prisma/client";  // 不要从 @prisma/client 导入
```

### 函数类型定义

✅ **正确**:
```typescript
async function processData(
  userId: number,
  options: ProcessOptions
): Promise<ProcessResult> {
  // ...
}
```

❌ **错误**:
```typescript
async function processData(userId, options) {  // 缺少类型
  // ...
}
```

### 组件 Props

✅ **正确**:
```typescript
interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

export function Button({ children, onClick, variant = "primary" }: ButtonProps) {
  // ...
}
```

## React 和 Next.js 规范

### 服务端组件 vs 客户端组件

**默认使用服务端组件**：
```typescript
// app/page.tsx - 默认是服务端组件
export default async function Page() {
  const data = await fetchData();
  return <PageContent data={data} />;
}
```

**客户端组件**（仅在需要时）：
```typescript
"use client";

import { useState } from "react";

export function ClientComponent() {
  const [state, setState] = useState();
  return <div onClick={() => setState(newValue)}>{state}</div>;
}
```

**何时使用客户端组件**:
- 事件处理器（onClick, onChange）
- 状态管理（useState, useReducer）
- 副作用（useEffect）
- 浏览器 API（localStorage, window）
- Context Providers

### Page 组件结构

```typescript
// app/(feature)/page.tsx
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { generatePageMetadata } from "@/lib/request/metadata";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("metadata");
  return generatePageMetadata({
    title: t("title"),
    description: t("description"),
  });
}

export default async function Page() {
  const data = await fetchData();

  return (
    <Suspense fallback={<Loading />}>
      <PageContent data={data} />
    </Suspense>
  );
}
```

### Layout 模式

```typescript
// app/(feature)/layout.tsx
import type { ReactNode } from "react";

export default async function Layout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="layout-container">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

## Server Actions 规范

### 文件结构

```typescript
// app/(feature)/actions.ts
"use server";

import { auth } from "@/auth";
import { prisma } from "@/prisma/prisma";
import type { ServerActionResult } from "@/lib/serverAction";

export async function createItem(data: CreateItemInput): Promise<ServerActionResult<Item>> {
  try {
    const session = await auth();
    if (!session) {
      return {
        success: false,
        message: "Unauthorized",
        code: "unauthorized",
      };
    }

    const result = await prisma.item.create({ data });
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to create item:", error);
    return {
      success: false,
      message: "Internal server error",
      code: "internal_server_error",
    };
  }
}
```

### 使用 withAuth 辅助函数

```typescript
import { withAuth } from "@/lib/request/withAuth";

export const updateProfile = withAuth(
  async ({ session, user }, profileData: ProfileData) => {
    // session 和 user 自动可用
    const result = await prisma.userProfile.update({
      where: { userId: user.id },
      data: profileData,
    });
    return { success: true, data: result };
  }
);
```

## Styling 规范

### Tailwind CSS

**使用 `cn()` 工具**:
```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "base-class",
  condition && "conditional-class",
  variant === "primary" && "primary-variant"
)} />
```

### Component Variants

使用 `class-variance-authority`:
```typescript
import { cva } from "class-variance-authority";

const buttonVariants = cva("base-classes", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      secondary: "bg-secondary text-secondary-foreground",
    },
    size: {
      sm: "h-9 px-3",
      lg: "h-11 px-8",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "sm",
  },
});

export function Button({ variant, size, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
```

### 主题变量

使用 CSS 变量:
```typescript
<div className="bg-background text-foreground border-border" />
```

## Prisma 规范

### 导入路径

✅ **正确**:
```typescript
import { prisma } from "@/prisma/prisma";
import type { User, Prisma } from "@/prisma/client";
```

❌ **错误**:
```typescript
import { PrismaClient } from "@prisma/client";
import type { User } from "@prisma/client";
```

### 查询优化

```typescript
// ✅ 使用 select 减少数据传输
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, name: true, email: true },
});

// ✅ 使用 include 预加载关联
const chat = await prisma.userChat.findUnique({
  where: { token },
  include: {
    messages: { orderBy: { createdAt: "asc" } },
    user: { select: { id: true, name: true } },
  },
});
```

## Logger 规范

### 使用 Pino Logger

**重要**: Logger 只接受一个参数

✅ **正确**:
```typescript
logger.info({ msg: "Operation completed", userId, duration });
logger.error({ msg: "Operation failed", error: error.message, stack: error.stack });
```

❌ **错误**:
```typescript
logger.info("Message", { field1: value1 });  // 两个参数
logger.info({ field1: value1 });  // 缺少 msg 字段
```

### Child Logger

```typescript
const logger = rootLogger.child({ userId, sessionId });
logger.info({ msg: "User action", action: "login" });
```

## AI SDK 规范

### Provider 配置

```typescript
import { llm } from "@/ai/provider";

const result = streamText({
  model: llm("gpt-4o"),  // 使用抽象的 provider 函数
  messages,
  tools,
});
```

### 流式处理

```typescript
const result = streamText({
  model: llm("gpt-4o"),
  system: systemPrompt,
  messages,
  tools,

  // 平滑中文流式渲染
  experimental_transform: smoothStream({
    delayInMs: 30,
    chunking: /[\u4E00-\u9FFF]|\S+\s+/,
  }),

  // 追踪步骤和 token
  onStepFinish: async (step) => {
    await saveStepToDB(step);
    await trackTokenUsage(step);
  },

  onError: ({ error }) => {
    logger.error({ msg: "AI stream error", error: error.message });
  },
});
```

### Tool 定义

```typescript
import { tool } from "ai";
import { z } from "zod";

export const myTool = tool({
  description: "Clear tool description for the AI model",
  parameters: z.object({
    query: z.string().describe("Detailed parameter description"),
    limit: z.number().optional().describe("Optional parameter with default"),
  }),
  execute: async ({ query, limit = 10 }) => {
    const results = await performAction(query, limit);
    return results;
  },
});
```

## 命名规范

### 文件命名

- **组件**: PascalCase（`Button.tsx`, `UserProfile.tsx`）
- **工具函数**: camelCase（`formatDate.ts`, `apiClient.ts`）
- **类型文件**: camelCase（`types.ts`, `schemas.ts`）
- **常量**: camelCase（`constants.ts`, `config.ts`）

### 变量命名

```typescript
// ✅ 清晰描述性的命名
const userId = session.user.id;
const isAuthenticated = !!session;
const handleSubmit = async () => { ... };

// ❌ 模糊的命名
const id = session.user.id;
const flag = !!session;
const handle = async () => { ... };
```

## 错误处理

### Try-Catch 模式

```typescript
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  logger.error({
    msg: "Operation failed",
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    userId,
  });

  return {
    success: false,
    message: "Operation failed",
    code: "internal_server_error",
  };
}
```

## 注释规范

### TSDoc 注释

```typescript
/**
 * 处理用户数据并返回结果
 *
 * @param userId - 用户 ID
 * @param options - 处理选项
 * @returns 处理结果
 * @throws {Error} 当用户不存在时
 */
export async function processUserData(
  userId: number,
  options: ProcessOptions
): Promise<ProcessResult> {
  // ...
}
```

### 代码注释

```typescript
// ✅ 解释为什么（Why），而不是什么（What）
// 使用 setTimeout 避免竞态条件
setTimeout(() => updateState(), 100);

// ❌ 重复代码的注释
// 更新状态
updateState();
```

## Git Commit 规范

### Commit Message 格式

```
<type>: <subject>

[optional body]

[optional footer]
```

**类型**:
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例**:
```
feat: add user profile editing

- Add profile form component
- Implement update API
- Add validation

Closes #123
```

### 重要提示

**仅在 Claude 独立完成全部代码时添加署名**：
```
feat: add new feature

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
```

## 代码审查 Checklist

- [ ] 通过 ESLint 检查（零警告）
- [ ] 通过 TypeScript 类型检查
- [ ] 代码已格式化（Prettier）
- [ ] 添加必要的注释和文档
- [ ] 错误处理完善
- [ ] 性能已优化
- [ ] 测试已通过
- [ ] 无安全漏洞（SQL 注入、XSS等）

## 相关文档

- [测试指南](./testing.md)
- [架构概览](../architecture/overview.md)
- [数据库规范](../development/database/schema-overview.md)
- [CLAUDE.md](../../CLAUDE.md) - 详细的开发规范

---

最后更新：2025-12
