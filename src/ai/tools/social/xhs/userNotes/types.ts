import { PlainTextToolResult, SocialPost } from "@/ai/tools/types";

export interface XHSUserNote extends SocialPost {
  title: string;
  type: string;
}

export interface XHSUserNotesResult extends PlainTextToolResult {
  notes: XHSUserNote[];
  plainText: string;
}
