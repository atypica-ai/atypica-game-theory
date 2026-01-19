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
      "Manage memory content with three operations: 'append' to add new content at end, 'replace' to update existing line, 'delete' to remove a line. Use this to maintain persistent facts, preferences, or context.",
    inputSchema: memoryUpdateInputSchema,
    outputSchema: memoryUpdateOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    execute: async ({ operation, lineIndex, newLine }): Promise<MemoryUpdateToolResult> => {
      // Tool only validates and records the LLM's decision
      // Actual database operations are handled in updateMemory function
      let message = "";
      switch (operation) {
        case "append":
          message = "Memory update instruction recorded: append to end";
          break;
        case "replace":
          message = `Memory update instruction recorded: replace line ${lineIndex}`;
          break;
        case "delete":
          message = `Memory update instruction recorded: delete line ${lineIndex}`;
          break;
      }
      return { plainText: message };
    },
  });
