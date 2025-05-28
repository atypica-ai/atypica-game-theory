import { PlainTextToolResult, SocialPost, SocialUser } from "@/ai/tools/types";

export interface DYUserPost extends SocialPost {
  user: SocialUser & {
    secret_userid: string;
  };
}

export interface DYUserPostsResult extends PlainTextToolResult {
  posts: DYUserPost[];
  plainText: string;
}
