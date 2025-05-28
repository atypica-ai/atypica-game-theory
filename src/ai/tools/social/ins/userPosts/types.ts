import { PlainTextToolResult, SocialPost } from "@/ai/tools/types";

export interface InsUserPost extends SocialPost {
  code: string;
}

export interface InsUserPostsResult extends PlainTextToolResult {
  posts: InsUserPost[];
  plainText: string;
}
