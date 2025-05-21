import { PlainTextToolResult, SocialUser } from "@/ai/tools/types";

export interface DYUserPost {
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

export interface DYUserPostsResult extends PlainTextToolResult {
  posts: DYUserPost[];
  plainText: string;
}
