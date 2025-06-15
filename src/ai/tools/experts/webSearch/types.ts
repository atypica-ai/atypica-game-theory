import { PlainTextToolResult } from "@/ai/tools/types";

export interface WebSearchToolArgs {
  query: string;
}

export interface WebSearchToolResult extends PlainTextToolResult {
  answer?: string;
  results: { url: string; title: string; content: string }[];
}
