import { PlainTextToolResult, SocialPost } from "@/ai/tools/types";

export interface TwitterUserPost extends SocialPost {}

export interface TwitterUserPostsResult extends PlainTextToolResult {
  posts: TwitterUserPost[];
  plainText: string;
}
