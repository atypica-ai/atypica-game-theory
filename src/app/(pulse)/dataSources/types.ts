import { Logger } from "pino";

export interface Pulse {
  categoryName: string; // Category name (stored directly on Pulse.category)
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface DataSourceResult {
  pulses: Pulse[];
}

export interface DataSource {
  name: string;
  /**
   * Gather pulses for this dataSource
   * Each dataSource handles its own category logic:
   * - xTrend: Reads SystemConfig for category-query mappings
   * - Others: Uses predefined categories from code
   *
   * All dataSources return pulses with categoryName (stored directly on Pulse.category).
   */
  gatherPulses(logger: Logger): Promise<DataSourceResult>;
}

/**
 * Factory interface for creating dataSources dynamically
 * Used by xTrend to create one dataSource per category
 */
export interface DataSourceFactory {
  /**
   * Create dataSources based on runtime configuration
   * Called when getAllDataSources() is invoked
   */
  createDataSources(): Promise<DataSource[]>;
}

/**
 * Extended dataSource registry entry
 * Can be either a static DataSource or a DataSourceFactory
 */
export type DataSourceRegistryEntry = DataSource | DataSourceFactory;

/**
 * Check if entry is a factory
 */
export function isDataSourceFactory(entry: DataSourceRegistryEntry): entry is DataSourceFactory {
  return typeof (entry as DataSourceFactory).createDataSources === "function";
}

/**
 * DataSource name union type
 * Derived from dataSourceRegistry keys in index.ts
 * The registry is the single source of truth for dataSource names
 */
export type DataSourceName = string;

