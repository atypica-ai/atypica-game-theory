import { PlainTextToolResult } from "@/ai/tools/types";

export interface GenerateReportResult extends PlainTextToolResult {
  reportToken?: string;
  plainText: string;
}
