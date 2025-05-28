import { PlainTextToolResult, SocialPost } from "@/ai/tools/types";

export interface InsPost extends SocialPost {
  code: string;
}

export interface InsSearchResult extends PlainTextToolResult {
  posts: InsPost[];
  plainText: string;
}
