import "server-only";

import { Logger } from "pino";

/**
 * Options for podcast audio generation
 */
export interface PodcastGenerationOptions {
  script: string;
  podcastToken: string;
  locale?: string;
  hostCount: 1 | 2; // Number of hosts for audio generation (1 = solo, 2 = duo)
  logger?: Logger;
}

/**
 * Result of podcast audio generation
 */
export interface PodcastGenerationResult {
  audioBuffer: Buffer;
  duration?: number;
  mimeType: string;
  error?: string;
}

/**
 * Common interface for all TTS clients
 * Both Google TTS and Volcano TTS clients must implement this interface
 */
export interface TTSClient {
  /**
   * Generate podcast audio from script
   * @param options - Generation options including script, locale, and host count
   * @returns Audio buffer with metadata
   */
  fetchAudioChunks(options: PodcastGenerationOptions): Promise<PodcastGenerationResult>;
}
