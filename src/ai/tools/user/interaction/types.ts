import { PlainTextToolResult } from "@/ai/tools/types";

export interface RequestInteractionResult extends PlainTextToolResult {
  answer: string | string[];
  plainText: string;
}
