import { rootLogger } from "@/lib/logging";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

/**
 * Generate hash from text content
 */
export function generateContentHash(text: string): string {
  return crypto.createHash("sha256").update(text, "utf-8").digest("hex");
}

/**
 * Get format-content cache directory path for user
 */
export function getFormatContentCachePath(userId: number): string {
  return path.join(
    process.cwd(),
    ".next",
    "cache",
    "sandbox",
    "user",
    String(userId),
    "workspace",
    "format-content",
  );
}

/**
 * Get cache file path for specific content hash
 */
export function getCacheFilePath(userId: number, hash: string): string {
  return path.join(getFormatContentCachePath(userId), `${hash}.json`);
}

/**
 * Cached format content data
 */
export interface CachedFormatContent {
  originalText: string;
  formattedHtml: string;
}

/**
 * Ensure cache directory exists
 */
export async function ensureCacheDirectoryExists(userId: number): Promise<void> {
  const cachePath = getFormatContentCachePath(userId);
  await fs.mkdir(cachePath, { recursive: true });
}

/**
 * Read cached formatted content
 */
export async function readCachedContent(
  userId: number,
  hash: string,
): Promise<CachedFormatContent | null> {
  try {
    const filePath = getCacheFilePath(userId, hash);
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content) as CachedFormatContent;

    rootLogger.info({
      msg: "Format content cache hit",
      userId,
      hash,
    });

    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // File doesn't exist - cache miss
      rootLogger.debug({
        msg: "Format content cache miss",
        userId,
        hash,
      });
      return null;
    }

    // Other errors
    rootLogger.warn({
      msg: "Failed to read format content cache",
      userId,
      hash,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Write formatted content to cache
 */
export async function writeCachedContent(
  userId: number,
  hash: string,
  data: CachedFormatContent,
): Promise<void> {
  try {
    await ensureCacheDirectoryExists(userId);

    const filePath = getCacheFilePath(userId, hash);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");

    rootLogger.info({
      msg: "Format content cached",
      userId,
      hash,
    });
  } catch (error) {
    rootLogger.error({
      msg: "Failed to write format content cache",
      userId,
      hash,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
