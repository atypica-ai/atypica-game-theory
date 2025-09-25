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