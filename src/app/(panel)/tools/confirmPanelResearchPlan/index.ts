import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { tool } from "ai";
import { confirmPanelResearchPlanInputSchema, confirmPanelResearchPlanOutputSchema } from "./types";

/**
 * confirmPanelResearchPlan — human-in-the-loop tool for research plan confirmation.
 * Agent generates a research plan, frontend renders it for user review,
 * user can confirm to proceed or go back to modify.
 */
export const confirmPanelResearchPlanTool = tool({
  description:
    "Present the conversation plan to the user for confirmation before starting research. " +
    "The plan should describe ONLY: what topics to explore, what questions to ask the personas, and the discussion flow. " +
    "Do NOT include time estimates, preparation steps, or report generation steps in the plan. " +
    "User can edit the question and plan before confirming.",
  inputSchema: confirmPanelResearchPlanInputSchema,
  outputSchema: confirmPanelResearchPlanOutputSchema,
  toModelOutput: (result: PlainTextToolResult) => {
    return { type: "text" as const, value: result.plainText };
  },
  // No execute() — frontend handles via addToolResult
});
