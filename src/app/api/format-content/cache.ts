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
 * Get processing status file path
 */
export function getProcessingFilePath(userId: number, hash: string): string {
  return path.join(getFormatContentCachePath(userId), `${hash}.processing.json`);
}

/**
 * Cached format content data
 */
export interface CachedFormatContent {
  originalText: string;
  formattedHtml: string;
}

/**
 * Processing status data
 */
export interface ProcessingStatus {
  status: "processing";
  startedAt: string;
  triggeredBy: "frontend" | "backend";
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
    rootLogger.info({ msg: "Format content cache hit", userId, hash });
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // File doesn't exist - cache miss
      rootLogger.debug({ msg: "Format content cache miss", userId, hash });
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

/**
 * Write processing status
 */
export async function writeProcessingStatus(
  userId: number,
  hash: string,
  data: { triggeredBy: "frontend" | "backend" },
): Promise<void> {
  try {
    await ensureCacheDirectoryExists(userId);

    const filePath = getProcessingFilePath(userId, hash);
    const status: ProcessingStatus = {
      status: "processing",
      startedAt: new Date().toISOString(),
      triggeredBy: data.triggeredBy,
    };

    await fs.writeFile(filePath, JSON.stringify(status, null, 2), "utf-8");

    rootLogger.info({
      msg: "Processing status written",
      userId,
      hash,
      triggeredBy: data.triggeredBy,
    });
  } catch (error) {
    rootLogger.error({
      msg: "Failed to write processing status",
      userId,
      hash,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Read processing status
 */
export async function readProcessingStatus(
  userId: number,
  hash: string,
): Promise<ProcessingStatus | null> {
  try {
    const filePath = getProcessingFilePath(userId, hash);
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content) as ProcessingStatus;

    // Check if processing is stale (older than 5 minutes)
    const startedAt = new Date(parsed.startedAt);
    const now = new Date();
    const ageMinutes = (now.getTime() - startedAt.getTime()) / 1000 / 60;

    if (ageMinutes > 5) {
      // Stale processing file, clean it up
      rootLogger.warn({
        msg: "Found stale processing file, cleaning up",
        userId,
        hash,
        ageMinutes,
      });
      await deleteProcessingStatus(userId, hash);
      return null;
    }

    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    rootLogger.warn({
      msg: "Failed to read processing status",
      userId,
      hash,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Delete processing status file
 */
export async function deleteProcessingStatus(userId: number, hash: string): Promise<void> {
  try {
    const filePath = getProcessingFilePath(userId, hash);
    await fs.unlink(filePath);
    rootLogger.debug({ msg: "Processing status deleted", userId, hash });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // File doesn't exist, ignore
      return;
    }
    rootLogger.warn({
      msg: "Failed to delete processing status",
      userId,
      hash,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
