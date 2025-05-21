import { PlainTextToolResult, SocialUser } from "@/ai/tools/types";

export interface DYPost {
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

export interface DYSearchResult extends PlainTextToolResult {
  posts: DYPost[];
  // total: number;
  plainText: string;
}
