import { PlainTextToolResult } from "@/ai/tools/types";

export interface SaveAnalystToolResult extends PlainTextToolResult {
  analystId: number;
  plainText: string;
}
