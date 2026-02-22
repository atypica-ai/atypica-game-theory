import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { tool } from "ai";
import { requestSelectPersonasInputSchema, requestSelectPersonasOutputSchema } from "./types";

/**
 * requestSelectPersonas — human-in-the-loop (no execute).
 * Frontend renders a persona selector, user picks, output is personaIds.
 */
export const requestSelectPersonasTool = tool({
  description:
    "Present an interactive persona selector for the user to search and pick personas. " +
    "Use this when you need the user to manually select personas, e.g. for building a panel. " +
    "Pass personaIds from searchPersonas results to pre-populate the selector. " +
    "The user will review, add/remove, and confirm their selection. Output contains the selected persona IDs.",
  inputSchema: requestSelectPersonasInputSchema,
  outputSchema: requestSelectPersonasOutputSchema,
  toModelOutput: (result: PlainTextToolResult) => {
    return { type: "text" as const, value: result.plainText };
  },
  // No execute() — frontend handles via addToolResult
});
