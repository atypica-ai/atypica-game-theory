import "server-only";

import { xTrendFactory } from "./xTrend";
import {
  DataSource,
  DataSourceRegistryEntry,
  type DataSourceName,
  isDataSourceFactory,
} from "./types";

/**
 * Registry of all dataSources and factories
 *
 * ═══════════════════════════════════════════════════════════════
 * THIS IS THE SINGLE SOURCE OF TRUTH for dataSources.
 * ═══════════════════════════════════════════════════════════════
 *
 * To add a new dataSource:
 * 1. Create directory under dataSources/ with implementation
 * 2. Import and add ONE entry to this object below
 *
 * To add a factory-based dataSource (like xTrend):
 * 1. Create factory that implements DataSourceFactory
 * 2. Add factory to registry (e.g., xTrend: xTrendFactory)
 * 3. Factory will create multiple dataSources dynamically
 *
 * To remove a dataSource:
 * 1. Remove ONE entry from this object
 */
const dataSourceRegistry: Record<string, DataSourceRegistryEntry> = {
  xTrend: xTrendFactory, // Factory creates one dataSource per category
  // Future: paperTrend: paperTrendDataSource, // Static dataSource example
};

/**
 * Get all registered dataSource base names (keys of the registry)
 * This is derived from the registry, which is the single source of truth
 */
export function getDataSourceNames(): DataSourceName[] {
  return Object.keys(dataSourceRegistry);
}

// Re-export type for use in other modules
export type { DataSourceName };

/**
 * Get dataSource by name
 * Note: For factory-based dataSources, use the category-specific name (e.g., "xTrend:AI Tech")
 */
export async function getDataSource(name: string): Promise<DataSource | null> {
  // Check if it's a category-specific name (e.g., "xTrend:AI Tech")
  if (name.includes(":")) {
    const allDataSources = await getAllDataSources();
    return allDataSources.find((ds) => ds.name === name) || null;
  }

  // Check if it's a base name that maps to a factory
  const entry = dataSourceRegistry[name];
  if (!entry) {
    return null;
  }

  if (isDataSourceFactory(entry)) {
    // For factory, return first dataSource (or null if factory creates none)
    const factoryDataSources = await entry.createDataSources();
    return factoryDataSources[0] || null;
  }

  return entry;
}

/**
 * Get all registered dataSources
 * Factories are expanded to their individual dataSources
 */
export async function getAllDataSources(): Promise<DataSource[]> {
  const entries = Object.values(dataSourceRegistry);
  const dataSources: DataSource[] = [];

  for (const entry of entries) {
    if (isDataSourceFactory(entry)) {
      // Factory: create dataSources and add them
      const factoryDataSources = await entry.createDataSources();
      dataSources.push(...factoryDataSources);
    } else {
      // Static dataSource: add directly
      dataSources.push(entry);
    }
  }

  return dataSources;
}

