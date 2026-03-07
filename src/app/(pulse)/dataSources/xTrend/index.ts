"server-only";

/**
 * xTrend dataSource module
 * 
 * Exports the xTrend factory that creates one DataSource per category.
 * Each category becomes an independent dataSource (e.g., "xTrend:AI Tech")
 * that can be triggered separately and run in parallel.
 */

export { xTrendFactory } from "./factory";

