import { PlainTextToolResult, SocialPostComment } from "@/ai/tools/types";

export interface TwitterPostCommentsResult extends PlainTextToolResult {
  comments: SocialPostComment[];
}
