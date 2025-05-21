import { PlainTextToolResult, SocialUser } from "@/ai/tools/types";

export interface TikTokComment {
  id: string;
  content: string;
  user: SocialUser & {
    secret_userid: string;
  };
  like_count: number;
  sub_comment_count: number;
}

export interface TikTokPostCommentsResult extends PlainTextToolResult {
  comments: TikTokComment[];
}
