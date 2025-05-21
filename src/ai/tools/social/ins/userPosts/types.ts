import { PlainTextToolResult, SocialUser } from "@/ai/tools/types";

export interface InsUserPost {
  id: string;
  code: string;
  desc: string;
  liked_count: number;
  comments_count: number;
  user: SocialUser;
  images_list: {
    url: string;
  }[];
}

export interface InsUserPostsResult extends PlainTextToolResult {
  posts: InsUserPost[];
  plainText: string;
}
