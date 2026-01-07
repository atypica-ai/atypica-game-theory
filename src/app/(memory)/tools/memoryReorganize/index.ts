import "server-only";

import { tool } from "ai";
import {
  memoryReorganizeInputSchema,
  memoryReorganizeOutputSchema,
  type MemoryReorganizeToolResult,
} from "./types";

/**
 * Internal tool for reorganizing memory content.
 * This tool is used by the memoryReorganizeAgent, not exposed to regular agents.
 */
export const memoryReorganizeTool = () =>
  tool({
    description:
      "Reorganize and summarize user memory content to make it more concise while preserving important information.",
    inputSchema: memoryReorganizeInputSchema,
    outputSchema: memoryReorganizeOutputSchema,
    execute: async ({ currentContent }): Promise<MemoryReorganizeToolResult> => {
      // This tool is a placeholder - the actual reorganization is done by the agent
      // The agent will call this tool and provide the reorganized content
      // This tool just validates and returns the input
      return {
        reorganizedContent: currentContent,
      };
    },
  });
