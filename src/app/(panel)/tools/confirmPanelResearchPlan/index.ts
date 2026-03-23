import "server-only";

import { tool } from "ai";
import {
  confirmPanelResearchPlanInputSchema,
  confirmPanelResearchPlanOutputSchema,
  ConfirmPanelResearchPlanOutput,
} from "./types";

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
    "User can edit the question and plan before confirming. " +
    "The tool output contains the FINAL confirmed values which may differ from the originally proposed values — always use the output values for subsequent research execution.",
  inputSchema: confirmPanelResearchPlanInputSchema,
  outputSchema: confirmPanelResearchPlanOutputSchema,
  toModelOutput: (result: ConfirmPanelResearchPlanOutput) => {
    return {
      type: "text" as const,
      value:
        `Research plan confirmed by user.\n\n` +
        `Confirmed Research Question:\n${result.question}\n\n` +
        `Confirmed Execution Plan:\n${result.executionPlan}`,
    };
  },
  // No execute() — frontend handles via addToolResult
});
