import { PlainTextToolResult } from "@/ai/tools/types";

export interface ReasoningThinkingResult extends PlainTextToolResult {
  reasoning: string;
  text: string;
  plainText: string;
}
