import { PlainTextToolResult, SocialUser } from "@/ai/tools/types";

interface InsComment {
  id: string;
  content: string;
  user: SocialUser;
  like_count: number;
  sub_comment_count: number;
}

export interface InsPostCommentsResult extends PlainTextToolResult {
  comments: InsComment[];
}
