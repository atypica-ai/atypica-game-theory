import { PlainTextToolResult } from "@/ai/tools/types";

export interface GeneratePodcastResult extends PlainTextToolResult {
  podcastToken?: string;
  plainText: string;
}

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

export interface BatchPodcastGenerationParams {
  batchSize?: number;
  targetCount?: number;
  poolLimit?: number;
}

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
