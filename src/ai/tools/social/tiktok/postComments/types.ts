import { PlainTextToolResult, SocialPostComment, SocialUser } from "@/ai/tools/types";

export interface TikTokComment extends SocialPostComment {
  user: SocialUser & {
    secret_userid: string;
  };
}

export interface TikTokPostCommentsResult extends PlainTextToolResult {
  comments: TikTokComment[];
}
