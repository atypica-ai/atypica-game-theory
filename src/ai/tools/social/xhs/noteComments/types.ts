import { PlainTextToolResult, SocialUser } from "@/ai/tools/types";

interface XHSComment {
  id: string;
  content: string;
  user: SocialUser;
  like_count: number;
  sub_comment_count: number;
}

export interface XHSNoteCommentsResult extends PlainTextToolResult {
  comments: XHSComment[];
}
