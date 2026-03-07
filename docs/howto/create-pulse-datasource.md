# How to Create a New Pulse Data Source

This guide explains how to add a new data source to the Pulse Marketplace system. There are two patterns: **static data sources** (single data source) and **factory-based data sources** (multiple dynamic data sources).

## Overview

Data sources are modules that gather pulses from external sources (e.g., Twitter trends, research papers, news feeds). They implement a standard interface and are registered in the `dataSourceRegistry`.

## Architecture

```
src/app/(pulse)/dataSources/
├── index.ts              # Registry (single source of truth)
├── types.ts              # Interfaces and types
├── xTrend/               # Example: Factory-based data source
│   ├── index.ts
│   ├── factory.ts
│   └── gatherPulsesWithGrok.ts
└── yourDataSource/       # Your new data source
    ├── index.ts
    └── gatherPulses.ts
```

## Pattern 1: Static Data Source

Use this when you have a single, fixed data source that doesn't need dynamic configuration.

### Step 1: Create Data Source Directory

Create a new directory under `src/app/(pulse)/dataSources/`:

```bash
mkdir src/app/(pulse)/dataSources/yourDataSource
```

### Step 2: Implement the Data Source

Create `src/app/(pulse)/dataSources/yourDataSource/index.ts`:

```typescript
"use server";

import { DataSource, DataSourceResult } from "../types";
import { Logger } from "pino";
import { rootLogger } from "@/lib/logging";

/**
 * YourDataSource gathers pulses from [describe your source]
 */
export const yourDataSource: DataSource = {
  name: "yourDataSource",

  async gatherPulses(logger: Logger) {
    const sourceLogger = logger.child({ dataSource: "yourDataSource" });

    try {
      sourceLogger.info("Starting pulse gathering");

      // Your gathering logic here
      const pulses = await gatherPulsesFromYourSource();

      // Return pulses with categoryName
      // The orchestrator will ensure the category exists in PulseCategory table
      return {
        pulses: pulses.map((pulse) => ({
          categoryName: "Your Category", // or from your logic
          title: pulse.title,
          content: pulse.content,
          metadata: pulse.metadata, // optional
        })),
      };
    } catch (error) {
      sourceLogger.error(
        { error: (error as Error).message },
        "Failed to gather pulses",
      );
      throw error;
    }
  },
};

// Helper function (optional, can be in separate file)
async function gatherPulsesFromYourSource(): Promise<
  Array<{ title: string; content: string; metadata?: Record<string, unknown> }>
> {
  // Implement your gathering logic
  // Example: API calls, web scraping, database queries, etc.
  return [];
}
```

### Step 3: Register in Registry

Add to `src/app/(pulse)/dataSources/index.ts`:

```typescript
import { yourDataSource } from "./yourDataSource";

const dataSourceRegistry: Record<string, DataSourceRegistryEntry> = {
  xTrend: xTrendFactory,
  yourDataSource: yourDataSource, // Add your data source
  // ...
};
```

### Step 4: Ensure Categories Exist

Categories are automatically created by the orchestrator when pulses are saved. For static data sources, categories are typically hardcoded in your implementation.

If you need to create categories manually (e.g., in admin UI), add them to the `PulseCategory` table via the admin interface at `/admin/pulses`.

## Pattern 2: Factory-Based Data Source

Use this when you need to create multiple data sources dynamically based on configuration (e.g., one data source per category, like xTrend).

### Step 1: Create Data Source Directory

```bash
mkdir src/app/(pulse)/dataSources/yourFactoryDataSource
```

### Step 2: Implement the Factory

Create `src/app/(pulse)/dataSources/yourFactoryDataSource/factory.ts`:

```typescript
"use server";

import { prisma } from "@/prisma/prisma";
import { DataSource, DataSourceFactory } from "../types";
import { Logger } from "pino";
import { rootLogger } from "@/lib/logging";

export const yourFactoryDataSource: DataSourceFactory = {
  async createDataSources(): Promise<DataSource[]> {
    // Read configuration from database or other source
    const configs = await prisma.yourConfigTable.findMany({
      where: { enabled: true },
    });

    if (configs.length === 0) {
      return [];
    }

    // Create one DataSource per configuration
    return configs.map((config) => ({
      name: `yourFactoryDataSource:${config.name}`, // e.g., "yourFactoryDataSource:Category1"
      async gatherPulses(logger: Logger) {
        const categoryLogger = logger.child({
          dataSource: `yourFactoryDataSource:${config.name}`,
          configId: config.id,
        });

        try {
          // Use config-specific parameters
          const pulses = await gatherPulsesWithConfig(config);

          return {
            pulses: pulses.map((pulse) => ({
              categoryName: config.categoryName,
              title: pulse.title,
              content: pulse.content,
              metadata: pulse.metadata,
            })),
          };
        } catch (error) {
          categoryLogger.error(
            { error: (error as Error).message },
            "Failed to gather pulses",
          );
          throw error;
        }
      },
    }));
  },
};

async function gatherPulsesWithConfig(config: YourConfigType) {
  // Your gathering logic using config
  return [];
}
```

### Step 3: Export Factory

Create `src/app/(pulse)/dataSources/yourFactoryDataSource/index.ts`:

```typescript
"use server";

/**
 * YourFactoryDataSource module
 *
 * Exports the factory that creates one DataSource per configuration.
 * Each configuration becomes an independent dataSource (e.g., "yourFactoryDataSource:Config1")
 * that can be triggered separately and run in parallel.
 */

export { yourFactoryDataSource } from "./factory";
```

### Step 4: Register in Registry

Add to `src/app/(pulse)/dataSources/index.ts`:

```typescript
import { yourFactoryDataSource } from "./yourFactoryDataSource";

const dataSourceRegistry: Record<string, DataSourceRegistryEntry> = {
  xTrend: xTrendFactory,
  yourFactoryDataSource: yourFactoryDataSource, // Add your factory
  // ...
};
```

## Key Concepts

### Data Source Interface

All data sources must implement:

```typescript
interface DataSource {
  name: string; // Unique identifier
  gatherPulses(logger: Logger): Promise<DataSourceResult>;
}
```

### Pulse Structure

Pulses returned must have:

```typescript
interface Pulse {
  categoryName: string; // Will be used to lookup/create PulseCategory
  title: string;
  content: string;
  metadata?: Record<string, unknown>; // Optional extra data
}
```

### Category Management

- **Categories are auto-created**: The orchestrator (`gatherPulses.ts`) automatically creates `PulseCategory` entries if they don't exist
- **xTrend special case**: Uses `PulseCategory.query` field for category-specific queries
- **Other data sources**: Categories are defined in code (hardcoded or from your logic)

### Naming Conventions

- **Static data source**: Use simple name (e.g., `"paperTrend"`, `"newsFeed"`)
- **Factory data source**: Use base name in registry, category-specific names in generated data sources (e.g., `"xTrend:AI Tech"`)

## Testing

### Manual Testing via Admin UI

1. Navigate to `/admin/pulses`
2. Find your data source in the list
3. Click "Trigger" to test gathering
4. Check the database for new pulses

### Programmatic Testing

```typescript
import { getDataSource } from "@/app/(pulse)/dataSources";
import { gatherPulsesForDataSource } from "@/app/(pulse)/lib/gatherSignals";

// Test static data source
const dataSource = await getDataSource("yourDataSource");
const result = await dataSource.gatherPulses(rootLogger);

// Or use orchestrator
const result = await gatherPulsesForDataSource("yourDataSource");
```

## Best Practices

1. **Logging**: Always use the provided `logger` parameter for structured logging
2. **Error Handling**: Catch errors, log them, and re-throw for orchestrator to handle
3. **Category Names**: Use consistent, human-readable category names
4. **Metadata**: Store extra information in `metadata` field (e.g., source URL, timestamp, author)
5. **Performance**: Consider rate limits, pagination, and async operations
6. **Idempotency**: Design gathering to be safe to run multiple times

## Example: xTrend Reference

See `src/app/(pulse)/dataSources/xTrend/` for a complete factory-based implementation:

- `factory.ts`: Creates one data source per `PulseCategory` with non-empty `query`
- `gatherPulsesWithGrok.ts`: Core gathering logic using Grok LLM
- `index.ts`: Exports the factory

## Registry is Single Source of Truth

**Important**: The `dataSourceRegistry` in `index.ts` is the single source of truth. To add a data source:

1. Create your implementation
2. Add **ONE entry** to `dataSourceRegistry`
3. That's it! The system automatically:
   - Exposes it via `getAllDataSources()`
   - Makes it available in admin UI
   - Includes it in daily background jobs

## Next Steps

After creating your data source:

1. Test it via admin UI
2. Verify pulses are saved correctly
3. Check category creation
4. Monitor logs for errors
5. Consider adding to background job scheduler if needed

