import { PlainTextToolResult, SocialPost, SocialUser } from "@/ai/tools/types";

export interface DYPost extends SocialPost {
  user: SocialUser & {
    secret_userid: string;
  };
}

export interface DYSearchResult extends PlainTextToolResult {
  posts: DYPost[];
  plainText: string;
}
