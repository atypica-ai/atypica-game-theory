import { PlainTextToolResult, SocialPost, SocialUser } from "@/ai/tools/types";

export interface TikTokPost extends SocialPost {
  user: SocialUser & {
    secret_userid: string;
  };
}

export interface TikTokSearchResult extends PlainTextToolResult {
  posts: TikTokPost[];
  plainText: string;
}
