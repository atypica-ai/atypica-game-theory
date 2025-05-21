import { PlainTextToolResult, SocialUser } from "@/ai/tools/types";

export interface InsPost {
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

export interface InsSearchResult extends PlainTextToolResult {
  posts: InsPost[];
  // total: number;
  plainText: string;
}
