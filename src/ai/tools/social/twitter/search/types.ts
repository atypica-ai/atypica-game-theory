import { PlainTextToolResult, SocialPost } from "@/ai/tools/types";

export interface TwitterPost extends SocialPost {}

export interface TwitterSearchResult extends PlainTextToolResult {
  posts: TwitterPost[];
  plainText: string;
}
