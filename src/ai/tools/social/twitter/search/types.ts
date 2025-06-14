import { PlainTextToolResult, SocialPost } from "@/ai/tools/types";

export interface TwitterSearchResult extends PlainTextToolResult {
  posts: SocialPost[];
  plainText: string;
}
