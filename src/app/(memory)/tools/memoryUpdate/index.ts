import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { tool } from "ai";
import {
  memoryUpdateInputSchema,
  memoryUpdateOutputSchema,
  type MemoryUpdateToolResult,
} from "./types";

/**
 * Memory update tool.
 * Pure function: only validates and records LLM's decision.
 * No database operations - those are handled in the main updateMemory function.
 */
export const memoryUpdateTool = () =>
  tool({
    description:
      "Insert new content into memory at a specific line index. Use this to add persistent facts, preferences, or context.",
    inputSchema: memoryUpdateInputSchema,
    outputSchema: memoryUpdateOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async ({ lineIndex, newLine }): Promise<MemoryUpdateToolResult> => {
      // Tool only validates and records the LLM's decision
      // Actual database operations are handled in updateMemory function
      return {
        plainText: `Memory update instruction recorded: insert at line ${lineIndex === -1 ? "end" : lineIndex + 1}`,
      };
    },
  });
