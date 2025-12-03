import "server-only";

import { readFileSync } from "fs";
import { join } from "path";

/**
 * General-purpose audio cache for pre-encoded audio buffers
 *
 * Supports caching multiple audio types:
 * - silence: Silence buffer for insertion between podcast rounds
 * - prologue: Introduction audio (locale-specific)
 * - epilogue: Closing audio (locale-specific)
 *
 * Technical details:
 * - Format: MP3 (audio/mpeg)
 * - Sample Rate: 24000 Hz
 * - Audio data stored as base64 strings in audioCacheStore.json
 *
 * The audio is embedded as base64 strings to avoid filesystem dependencies
 * and ensure consistent behavior across different deployment environments.
 */
export type AudioCacheKey = "silence" | `prologue_${string}` | `epilogue_${string}`;

interface AudioCacheStore {
  silence: string;
  "prologue_zh-CN": string;
  "prologue_en-US": string;
  "epilogue_zh-CN": string;
  "epilogue_en-US": string;
}

export class AudioCache {
  private static cache: Map<string, Buffer> = new Map();
  private static isLoading: Set<string> = new Set();
  private static loadPromises: Map<string, Promise<Buffer>> = new Map();

  /**
   * Get a cached audio buffer by key
   * Thread-safe: multiple concurrent calls will wait for the same load operation
   *
   * @param key - Audio cache key (e.g., "silence", "prologue_zh-CN", "epilogue_en-US")
   * @returns Promise resolving to the audio buffer
   */
  static async get(key: AudioCacheKey): Promise<Buffer> {
    // Return immediately if already cached
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // If currently loading, wait for existing load operation
    if (this.isLoading.has(key) && this.loadPromises.has(key)) {
      return this.loadPromises.get(key)!;
    }

    // Start loading
    this.isLoading.add(key);
    const loadPromise = this.load(key);
    this.loadPromises.set(key, loadPromise);

    try {
      const buffer = await loadPromise;
      this.cache.set(key, buffer);
      return buffer;
    } finally {
      this.isLoading.delete(key);
      this.loadPromises.delete(key);
    }
  }

  /**
   * Get prologue audio for a specific locale
   */
  static async getPrologue(locale: string): Promise<Buffer> {
    const normalizedLocale = locale === "zh-CN" ? "zh-CN" : "en-US";
    return this.get(`prologue_${normalizedLocale}` as AudioCacheKey);
  }

  /**
   * Get epilogue audio for a specific locale
   */
  static async getEpilogue(locale: string): Promise<Buffer> {
    const normalizedLocale = locale === "zh-CN" ? "zh-CN" : "en-US";
    return this.get(`epilogue_${normalizedLocale}` as AudioCacheKey);
  }

  /**
   * Load audio buffer from cache store
   */
  private static async load(key: AudioCacheKey): Promise<Buffer> {
    try {
      // Load audio cache store JSON file
      const cacheStorePath = join(process.cwd(), "src/app/(podcast)/lib/volcano/audioCacheStore.json");
      const cacheStoreContent = readFileSync(cacheStorePath, "utf-8");
      const cacheStore: AudioCacheStore = JSON.parse(cacheStoreContent);

      // Get base64 string for the requested key
      const base64String = cacheStore[key as keyof AudioCacheStore];

      if (!base64String) {
        throw new Error(`Audio cache key "${key}" not found in cache store`);
      }

      // Decode base64 to buffer
      return Buffer.from(base64String.trim(), "base64");
    } catch (error) {
      throw new Error(`Failed to load audio cache for key "${key}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * @deprecated Use AudioCache.get('silence') instead
 * Kept for backward compatibility during migration
 */
export class SilenceBuffer {
  static async get(): Promise<Buffer> {
    return AudioCache.get("silence");
  }
}

