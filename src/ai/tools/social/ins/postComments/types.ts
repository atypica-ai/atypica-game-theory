import { PlainTextToolResult, SocialPostComment } from "@/ai/tools/types";

export interface InsPostCommentsResult extends PlainTextToolResult {
  comments: SocialPostComment[];
}
