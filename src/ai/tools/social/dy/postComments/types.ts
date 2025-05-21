import { PlainTextToolResult, SocialUser } from "@/ai/tools/types";

interface DYComment {
  id: string;
  content: string;
  user: SocialUser & {
    secret_userid: string;
  };
  like_count: number;
  sub_comment_count: number;
}

export interface DYPostCommentsResult extends PlainTextToolResult {
  comments: DYComment[];
}
