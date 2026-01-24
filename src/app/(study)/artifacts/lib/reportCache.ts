import "server-only";

import path from "path";

/**
 * Get the cache directory path for a report
 */
export function getReportCacheDir(userId: number, reportToken: string): string {
  return path.join(
    process.cwd(),
    ".next/cache/sandbox/user",
    String(userId),
    "reports",
    reportToken,
  );
}

/**
 * Get the cache file path for report HTML
 */
export function getReportCacheFilePath(userId: number, reportToken: string): string {
  return path.join(getReportCacheDir(userId, reportToken), "onePageHtml.html");
}
