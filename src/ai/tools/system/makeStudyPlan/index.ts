import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { tool } from "ai";
import { makeStudyPlanInputSchema, makeStudyPlanOutputSchema } from "./types";

/**
 * Make comprehensive study plan and request user confirmation
 *
 * This tool is designed for Plan Mode (Intent Layer) to output a complete research plan
 * after clarifying user intent through dialogue, background research, and automatic determination.
 *
 * Key characteristics:
 * - No execute function implementation - frontend handles via addToolResult
 * - All information in one call (locale, kind, role, topic, planContent)
 * - Frontend displays plan confirmation UI from tool call input parameters
 * - User confirmation triggers frontend server action + addToolResult
 *
 * Flow:
 * 1. AI calls makeStudyPlan with complete plan
 * 2. Frontend intercepts tool call, shows confirmation UI
 * 3. User clicks confirm → frontend saves analyst → sends addToolResult
 * 4. Backend receives addToolResult → reloads userChat → routes to execution agent
 */
export const makeStudyPlanTool = tool({
  description: `
    Make comprehensive study plan and request user confirmation.

    Call this tool when you have:
    1. Clarified user's research intent through dialogue
    2. Conducted background research (webSearch/webFetch if needed)
    3. Auto-determined research kind, framework, and method
    4. Calculated cost estimation

    The tool will display the complete plan to user for confirmation.
    User can choose to: confirm and start execution, modify plan, or cancel.

    **Important**:
    - Do NOT call requestInteraction or saveAnalyst separately - this tool handles everything
    - Output complete planContent in markdown format with all required sections
    - This is a one-time call - wait for user confirmation after calling
  `,
  inputSchema: makeStudyPlanInputSchema,
  outputSchema: makeStudyPlanOutputSchema,
  toModelOutput: (result: PlainTextToolResult) => {
    return { type: "text", value: result.plainText };
  },
  // 不实现 execute - 前端通过 addToolResult 方法回复
  // No execute implementation - frontend replies via addToolResult method
  // This is a standard AI SDK pattern for tools requiring human confirmation
});
