import { PlainTextToolResult, SocialPostComment } from "@/ai/tools/types";

export interface XHSNoteCommentsResult extends PlainTextToolResult {
  comments: SocialPostComment[];
}
