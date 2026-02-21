import "server-only";

import { toolCallError } from "@/ai/tools/error";
import { reasoningThinkingTool, webFetchTool, webSearchTool } from "@/ai/tools/tools";
import { requestSelectPersonasTool } from "@/app/(panel)/tools/requestSelectPersonas";
import { updatePanelTool } from "@/app/(panel)/tools/updatePanel";
import { deepResearchTool } from "@/app/(deepResearch)/deepResearch";
import {
  discussionChatTool,
  generatePodcastTool,
  generateReportTool,
  interviewChatTool,
  searchPersonasTool,
} from "@/app/(study)/tools";
import { UniversalToolName } from "@/app/(universal)/tools/types";
import { Tool, ToolSet } from "ai";
import { listSkillsTool } from "./listSkills";

/**
 * bash-tool CommandResult type
 */
interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Universal Agent Tool Set
 * Completely independent from Study tools
 */
export type UniversalToolSet = Partial<{
  [UniversalToolName.reasoningThinking]: ReturnType<typeof reasoningThinkingTool>;
  [UniversalToolName.webSearch]: ReturnType<typeof webSearchTool>;
  [UniversalToolName.webFetch]: ReturnType<typeof webFetchTool>;
  [UniversalToolName.bash]: Tool<{ command: string }, CommandResult>;
  [UniversalToolName.readFile]: Tool<{ path: string }, { content: string }>;
  [UniversalToolName.writeFile]: Tool<{ path: string; content: string }, { success: boolean }>;
  [UniversalToolName.listSkills]: ReturnType<typeof listSkillsTool>;
  [UniversalToolName.searchPersonas]: ReturnType<typeof searchPersonasTool>;
  [UniversalToolName.discussionChat]: ReturnType<typeof discussionChatTool>;
  [UniversalToolName.interviewChat]: ReturnType<typeof interviewChatTool>;
  [UniversalToolName.deepResearch]: ReturnType<typeof deepResearchTool>;
  [UniversalToolName.generateReport]: ReturnType<typeof generateReportTool>;
  [UniversalToolName.generatePodcast]: ReturnType<typeof generatePodcastTool>;
  [UniversalToolName.requestSelectPersonas]: typeof requestSelectPersonasTool;
  [UniversalToolName.updatePanel]: ReturnType<typeof updatePanelTool>;
  [UniversalToolName.toolCallError]: typeof toolCallError;
}>;

// Type check to ensure it conforms to AI SDK's ToolSet
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type UniversalToolSetCheck = UniversalToolSet extends ToolSet ? true : false;

export { listSkillsTool };
