import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { tool } from "ai";
import { z } from "zod";
import { memoryNoUpdateOutputSchema, type MemoryNoUpdateToolResult } from "./types";

/**
 * Memory no-update tool.
 * Use this when no information from the conversation should be remembered.
 */
export const memoryNoUpdateTool = () =>
  tool({
    description:
      "Use this tool when no information from the conversation should be remembered. Only use this when the conversation contains no persistent, actionable, or factual information worth storing.",
    inputSchema: z.object({}),
    outputSchema: memoryNoUpdateOutputSchema,
    toModelOutput: (result: PlainTextToolResult) => {
      return { type: "text", value: result.plainText };
    },
    execute: async (): Promise<MemoryNoUpdateToolResult> => {
      return {
        plainText:
          "No memory update needed - conversation contains no information worth remembering.",
      };
    },
  });
