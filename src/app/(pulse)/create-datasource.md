# 如何创建新的 Pulse 数据源

两种模式：**静态数据源**（固定单个）和 **工厂数据源**（按配置动态生成多个）。

## 目录结构

```
src/app/(pulse)/dataSources/
├── index.ts              # 注册表（唯一注册入口）
├── types.ts              # DataSource / DataSourceFactory 接口
├── xTrend/               # 工厂示例：按类别生成多个数据源
│   ├── index.ts
│   ├── factory.ts        # 从 SystemConfig 读类别配置
│   └── gatherPulsesWithGrok.ts
└── yourDataSource/       # 新数据源
    ├── index.ts
    └── gatherPulses.ts
```

## 模式 1：静态数据源

适用于固定来源、不需要动态配置的场景。

```typescript
// src/app/(pulse)/dataSources/yourDataSource/index.ts
"use server";

import { DataSource } from "../types";
import { Logger } from "pino";

export const yourDataSource: DataSource = {
  name: "yourDataSource",

  async gatherPulses(logger: Logger) {
    const sourceLogger = logger.child({ dataSource: "yourDataSource" });
    sourceLogger.info("Starting pulse gathering");

    const pulses = await gatherFromYourSource();

    return {
      pulses: pulses.map((pulse) => ({
        categoryName: "Your Category", // 直接写字符串，存入 Pulse.category
        title: pulse.title,
        content: pulse.content,
      })),
    };
  },
};
```

## 模式 2：工厂数据源

适用于按配置（如按类别）动态生成多个数据源的场景。参考 xTrend 实现。

```typescript
// src/app/(pulse)/dataSources/yourFactory/factory.ts
"use server";

import { prisma } from "@/prisma/prisma";
import { DataSource, DataSourceFactory } from "../types";
import { Logger } from "pino";

export const yourFactory: DataSourceFactory = {
  async createDataSources(): Promise<DataSource[]> {
    // 从 SystemConfig 或其他来源读取配置
    const config = await prisma.systemConfig.findUnique({
      where: { key: "pulse:yourFactory:categories" },
    });
    const categories = (config?.value as Array<{ name: string; query: string }>) ?? [];

    return categories.map((cat) => ({
      name: `yourFactory:${cat.name}`, // 命名规范: "baseName:categoryName"
      async gatherPulses(logger: Logger) {
        // 用 cat.query 去采集数据
        return { pulses: [] };
      },
    }));
  },
};
```

## 注册

在 `dataSources/index.ts` 的 `dataSourceRegistry` 中添加一行：

```typescript
const dataSourceRegistry: Record<string, DataSourceRegistryEntry> = {
  xTrend: xTrendFactory,
  yourDataSource: yourDataSource, // 添加这行
};
```

注册后系统自动：
- 通过 `getAllDataSources()` 暴露
- 在 admin 管理页 `/admin/pulses` 显示
- 纳入每日 pipeline 自动执行

## 关键设计

- **category 是字符串**：直接存在 `Pulse.category` 字段（`VARCHAR(100)`），不是外键
- **xTrend 的类别配置**存在 `SystemConfig` 表（key: `pulse:xTrend:categories`），不是单独的表
- **命名规范**：静态数据源用简单名（`"paperTrend"`），工厂数据源用 `"baseName:categoryName"` 格式

## 测试

通过 admin 页面 `/admin/pulses` 手动触发，或调用 admin server action：

```typescript
import { triggerDataSourceGathering } from "@/app/admin/pulses/actions";

// 触发单个
await triggerDataSourceGathering("yourDataSource");
// 触发工厂的所有类别
await triggerDataSourceGathering("xTrend");
// 触发工厂的特定类别
await triggerDataSourceGathering("xTrend:AI Tech");
```
