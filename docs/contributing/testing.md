# 测试指南

本文档介绍 atypica.AI 项目的测试策略和最佳实践。

## 测试工具

### Vitest

**配置**: `vitest.config.ts`

```bash
# 运行所有测试
pnpm test

# 监听模式
pnpm test --watch

# 覆盖率报告
pnpm test --coverage
```

**特性**:

- 基于 Vite 的快速测试运行器
- 兼容 Jest API
- jsdom 环境支持
- TypeScript 原生支持

### 配置要点

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

## 测试策略

### 测试金字塔

```
       /\
      /  \     E2E Tests (少量)
     /----\
    /      \   Integration Tests (中等)
   /--------\
  /          \ Unit Tests (大量)
 /____________\
```

- **单元测试**: 测试独立函数和组件
- **集成测试**: 测试模块间交互
- **E2E 测试**: 测试完整用户流程

## 单元测试

### 工具函数测试

```typescript
// lib/utils.test.ts
import { describe, it, expect } from "vitest";
import { formatDate, calculateTokenCost } from "./utils";

describe("utils", () => {
  describe("formatDate", () => {
    it("should format date correctly", () => {
      const date = new Date("2024-12-06T10:00:00Z");
      expect(formatDate(date)).toBe("2024-12-06");
    });

    it("should handle invalid date", () => {
      expect(() => formatDate(null)).toThrow();
    });
  });

  describe("calculateTokenCost", () => {
    it("should calculate cost for GPT-4", () => {
      const cost = calculateTokenCost("gpt-4", 1000);
      expect(cost).toBeGreaterThan(0);
    });

    it("should return 0 for unknown model", () => {
      const cost = calculateTokenCost("unknown", 1000);
      expect(cost).toBe(0);
    });
  });
});
```

### React 组件测试

```typescript
// components/Button.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("should render with children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("should call onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText("Click me"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should apply correct variant class", () => {
    const { container } = render(<Button variant="secondary">Button</Button>);
    expect(container.firstChild).toHaveClass("bg-secondary");
  });
});
```

### Hooks 测试

```typescript
// hooks/useUser.test.ts
import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useUser } from "./useUser";

describe("useUser", () => {
  it("should fetch user data", async () => {
    const { result } = renderHook(() => useUser(123));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeDefined();
    expect(result.current.user?.id).toBe(123);
  });

  it("should handle error", async () => {
    const { result } = renderHook(() => useUser(-1));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
```

## 集成测试

### API 路由测试

```typescript
// app/api/health/route.test.ts
import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("/api/health", () => {
  it("should return 200 for ping", async () => {
    const request = new Request("http://localhost:3000/api/health?api=ping");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it("should return 200 for database check", async () => {
    const request = new Request("http://localhost:3000/api/health?api=database");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

### Server Actions 测试

```typescript
// app/(feature)/actions.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createItem, updateItem } from "./actions";

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(() =>
    Promise.resolve({
      user: { id: 1, email: "test@example.com" },
    }),
  ),
}));

// Mock prisma
vi.mock("@/prisma/prisma", () => ({
  prisma: {
    item: {
      create: vi.fn((data) => Promise.resolve({ id: 1, ...data })),
      update: vi.fn((args) => Promise.resolve({ id: 1, ...args.data })),
    },
  },
}));

describe("Item Actions", () => {
  it("should create item successfully", async () => {
    const result = await createItem({ name: "Test Item" });

    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("Test Item");
  });

  it("should handle creation error", async () => {
    // TODO: Mock error scenario
  });
});
```

### AI Tool 测试

```typescript
// ai/tools/myTool.test.ts
import { describe, it, expect } from "vitest";
import { myTool } from "./myTool";

describe("myTool", () => {
  it("should have correct schema", () => {
    expect(myTool.description).toBeDefined();
    expect(myTool.parameters).toBeDefined();
  });

  it("should execute successfully", async () => {
    const result = await myTool.execute({
      query: "test query",
      limit: 10,
    });

    expect(result).toBeDefined();
  });

  it("should handle invalid parameters", async () => {
    await expect(myTool.execute({ query: "", limit: -1 })).rejects.toThrow();
  });
});
```

## E2E 测试

### Playwright (可选)

虽然当前项目使用 Vitest，但对于完整的 E2E 测试，可以考虑 Playwright：

```typescript
// e2e/auth.spec.ts
import { test, expect } from "@playwright/test";

test("user can sign in", async ({ page }) => {
  await page.goto("/signin");

  await page.fill('input[name="email"]', "test@example.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL("/dashboard");
});
```

## Mock 策略

### Mock 数据库

```typescript
import { vi } from "vitest";

// 完整 mock
vi.mock("@/prisma/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// 部分 mock
const mockFindUnique = vi.fn();
vi.mocked(prisma.user.findUnique).mockImplementation(mockFindUnique);
```

### Mock AI SDK

```typescript
vi.mock("ai", () => ({
  streamText: vi.fn(() => ({
    toUIMessageStreamResponse: vi.fn(() => new Response("Mock response")),
  })),
  tool: vi.fn((config) => config),
}));
```

### Mock 环境变量

```typescript
import { beforeAll, afterAll } from "vitest";

beforeAll(() => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
});

afterAll(() => {
  delete process.env.DATABASE_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
});
```

## 测试最佳实践

### 1. AAA 模式

```typescript
it("should do something", () => {
  // Arrange - 准备测试数据
  const input = { name: "test" };

  // Act - 执行被测试的代码
  const result = processInput(input);

  // Assert - 验证结果
  expect(result.success).toBe(true);
});
```

### 2. 描述性测试名称

```typescript
// ✅ 清晰描述预期行为
it("should return error when email is invalid", () => { ... });

// ❌ 模糊的测试名称
it("test email", () => { ... });
```

### 3. 独立测试

```typescript
// ✅ 每个测试独立
describe("User", () => {
  it("should create user", async () => {
    const user = await createUser({ email: "test@example.com" });
    expect(user.email).toBe("test@example.com");
  });

  it("should update user", async () => {
    const user = await createUser({ email: "test@example.com" });
    const updated = await updateUser(user.id, { name: "New Name" });
    expect(updated.name).toBe("New Name");
  });
});

// ❌ 测试间有依赖
let userId: number;

it("should create user", async () => {
  const user = await createUser({ email: "test@example.com" });
  userId = user.id; // 不好：依赖外部状态
});

it("should update user", async () => {
  await updateUser(userId, { name: "New Name" }); // 依赖上一个测试
});
```

### 4. 边界条件测试

```typescript
describe("formatCurrency", () => {
  it("should handle zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("should handle negative numbers", () => {
    expect(formatCurrency(-100)).toBe("-$100.00");
  });

  it("should handle large numbers", () => {
    expect(formatCurrency(1000000)).toBe("$1,000,000.00");
  });

  it("should handle decimal places", () => {
    expect(formatCurrency(10.555)).toBe("$10.56");
  });
});
```

### 5. 错误场景测试

```typescript
describe("Error Handling", () => {
  it("should throw on invalid input", () => {
    expect(() => validateEmail("invalid")).toThrow("Invalid email");
  });

  it("should handle async errors", async () => {
    await expect(fetchUser(-1)).rejects.toThrow("User not found");
  });

  it("should return error result", async () => {
    const result = await createItem({});
    expect(result.success).toBe(false);
    expect(result.code).toBe("validation_error");
  });
});
```

## 测试覆盖率

### 目标

- **语句覆盖率**: > 80%
- **分支覆盖率**: > 75%
- **函数覆盖率**: > 80%
- **行覆盖率**: > 80%

### 生成报告

```bash
pnpm test --coverage
```

### 关注重点

优先测试：

1. **业务逻辑**: 核心算法和数据处理
2. **工具函数**: 可复用的辅助函数
3. **API 路由**: 公开的 API 端点
4. **Server Actions**: 服务端操作
5. **AI Tools**: AI 工具的 execute 函数

可以跳过：

- UI 组件的样式测试
- 简单的数据传递组件
- 第三方库的 wrapper

## 持续集成

### GitHub Actions

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 22
          cache: "pnpm"

      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

## 调试测试

### VS Code 配置

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Vitest",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["test", "--run", "${file}"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### 调试单个测试

```typescript
it.only("should debug this test", () => {
  // 添加 .only 只运行这个测试
  const result = someFunction();
  expect(result).toBe(expected);
});
```

## 测试数据管理

### Fixtures

```typescript
// tests/fixtures/users.ts
export const mockUser = {
  id: 1,
  email: "test@example.com",
  name: "Test User",
};

export const mockUsers = [mockUser, { id: 2, email: "test2@example.com", name: "Test User 2" }];
```

### Factory Functions

```typescript
// tests/factories/user.ts
let userId = 1;

export function createMockUser(overrides = {}) {
  return {
    id: userId++,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    ...overrides,
  };
}
```

## 常见问题

### next-intl 配置

项目使用 inline dependency 配置：

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: "jsdom",
    deps: {
      inline: ["next-intl"],
    },
  },
});
```

### Prisma Mock

使用 `vitest` 的 mock 系统：

```typescript
vi.mock("@/prisma/prisma", () => ({
  prisma: {
    // Mock 你需要的方法
  },
}));
```

## 相关文档

- [Vitest 官方文档](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [代码风格指南](./code-style.md)
- [架构概览](../architecture/overview.md)

---

最后更新：2025-12
