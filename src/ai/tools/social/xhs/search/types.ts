import { PlainTextToolResult, SocialPost } from "@/ai/tools/types";

export interface XHSNote extends SocialPost {
  title: string;
  type: string;
}

export interface XHSSearchResult extends PlainTextToolResult {
  notes: XHSNote[];
  plainText: string;
}
