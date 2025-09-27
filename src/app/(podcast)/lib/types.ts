import type { Analyst, AnalystPodcast } from "@/prisma/client";
import type { Locale } from "next-intl";
import type { Logger } from "pino";

export interface PodcastGenerationParams {
  analystId: number;
  instruction?: string;
  systemPrompt?: string;
}

export interface PodcastAudioGenerationParams {
  podcastId: number;
  podcastToken: string;
  script: string;
  locale: string;
}

export interface PodcastCreationParams {
  analystId: number;
  instruction: string;
  token?: string;
}

// Enhanced interface for the unified script generation function
export interface PodcastScriptGenerationParams {
  // Option 1: Provide analystId (will fetch analyst and create podcast record)
  analystId?: number;
  // Option 2: Provide pre-fetched analyst and podcast (for advanced use cases)
  analyst?: Analyst & { interviews: { conclusion: string }[] };
  podcast?: AnalystPodcast;
  // Common parameters
  instruction?: string;
  systemPrompt?: string;
  locale?: Locale;
  abortSignal?: AbortSignal;
  statReport?: (dimension: string, value: number, extra?: unknown) => Promise<void>;
  logger?: Logger;
}

// Interface for analyst selection function
export interface AnalystSelectionParams {
  analysts: Analyst[];
  topN?: number;
  systemPrompt?: string;
  logger?: Logger;
}

export interface AnalystSelectionResult {
  selectedAnalystIds: number[];
  reasoning?: string;
}

// Interface for batch generation parameters
export interface BatchPodcastGenerationParams {
  batchSize?: number;
  targetCount?: number;
  poolLimit?: number;
}

// Interface for batch generation results
export interface BatchPodcastGenerationResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  selectedAnalystIds: number[];
  results: Array<{
    analystId: number;
    status: "success" | "error";
    error?: string;
    podcastId?: number;
    podcastToken?: string;
  }>;
  summary: {
    poolSize: number;
    selectedCount: number;
    processingTimeMs: number;
  };
}
