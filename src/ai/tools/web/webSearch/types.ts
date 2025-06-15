import { PlainTextToolResult } from "@/ai/tools/types";

export interface WebSearchToolArgs {
  query: string;
}

export interface WebSearchToolResult extends PlainTextToolResult {
  answer?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: any[];
}
