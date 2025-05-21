import { PlainTextToolResult, SocialUser } from "@/ai/tools/types";

export interface TikTokUserPost {
  id: string;
  desc: string;
  liked_count: number;
  collected_count: number;
  comments_count: number;
  user: SocialUser & {
    secret_userid: string;
  };
  images_list: {
    url: string;
  }[];
}

export interface TikTokUserPostsResult extends PlainTextToolResult {
  posts: TikTokUserPost[];
  plainText: string;
}
