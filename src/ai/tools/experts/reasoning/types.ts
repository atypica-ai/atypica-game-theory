import { PlainTextToolResult } from "@/ai/tools/types";

export interface ReasoningThinkingResult extends PlainTextToolResult {
  reasoningText: string;
  text: string;
  plainText: string;
}
