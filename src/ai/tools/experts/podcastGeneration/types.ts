import { PlainTextToolResult } from "@/ai/tools/types";

export interface GeneratePodcastResult extends PlainTextToolResult {
  podcastToken?: string;
  plainText: string;
} 