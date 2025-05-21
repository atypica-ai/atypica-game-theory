import { PlainTextToolResult } from "@/ai/tools/types";

export interface RequestPaymentResult extends PlainTextToolResult {
  plainText: string;
}
