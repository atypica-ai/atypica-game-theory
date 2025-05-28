import { PlainTextToolResult, SocialPostComment, SocialUser } from "@/ai/tools/types";

interface DYComment extends SocialPostComment {
  user: SocialUser & {
    secret_userid: string;
  };
}

export interface DYPostCommentsResult extends PlainTextToolResult {
  comments: DYComment[];
}
