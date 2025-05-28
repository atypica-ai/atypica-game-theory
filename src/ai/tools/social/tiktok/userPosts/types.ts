import { PlainTextToolResult, SocialPost, SocialUser } from "@/ai/tools/types";

export interface TikTokUserPost extends SocialPost {
  user: SocialUser & {
    secret_userid: string;
  };
}

export interface TikTokUserPostsResult extends PlainTextToolResult {
  posts: TikTokUserPost[];
  plainText: string;
}
