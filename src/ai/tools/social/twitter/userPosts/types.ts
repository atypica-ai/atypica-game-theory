import { PlainTextToolResult, SocialPost } from "@/ai/tools/types";

export interface TwitterUserPostsResult extends PlainTextToolResult {
  posts: SocialPost[];
  plainText: string;
}
