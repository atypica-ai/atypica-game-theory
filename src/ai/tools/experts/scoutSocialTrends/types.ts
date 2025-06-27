import { PlainTextToolResult, TPlatform } from "@/ai/tools/types";

export interface ScoutSocialTrendsResult extends PlainTextToolResult {
  stats?: {
    [platform in TPlatform]: number;
  };
  summary: string;
  plainText: string;
}
