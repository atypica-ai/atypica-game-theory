import "server-only";

import {
  buildPersonaTool,
  createSubAgentTool,
  discussionChatTool,
  generatePodcastTool,
  generateReportTool,
  interviewChatTool,
  planPodcastTool,
  planStudyTool,
  reasoningThinkingTool,
  requestInteractionTool,
  saveAnalystTool,
  scoutTaskChatTool,
  searchPersonasTool,
  toolCallError,
  webFetchTool,
  webSearchTool,
} from "@/ai/tools/tools";
import { ToolName } from "@/ai/tools/types";
import { ToolSet } from "ai";

export type StudyToolSet = Partial<{
  [ToolName.requestInteraction]: typeof requestInteractionTool;
  [ToolName.webFetch]: ReturnType<typeof webFetchTool>;
  [ToolName.webSearch]: ReturnType<typeof webSearchTool>;
  [ToolName.saveAnalyst]: ReturnType<typeof saveAnalystTool>;
  [ToolName.reasoningThinking]: ReturnType<typeof reasoningThinkingTool>;
  [ToolName.searchPersonas]: ReturnType<typeof searchPersonasTool>;
  [ToolName.scoutTaskChat]: ReturnType<typeof scoutTaskChatTool>;
  [ToolName.buildPersona]: ReturnType<typeof buildPersonaTool>;
  [ToolName.interviewChat]: ReturnType<typeof interviewChatTool>;
  [ToolName.discussionChat]: ReturnType<typeof discussionChatTool>;
  [ToolName.generateReport]: ReturnType<typeof generateReportTool>;
  [ToolName.generatePodcast]: ReturnType<typeof generatePodcastTool>;
  [ToolName.planStudy]: ReturnType<typeof planStudyTool>;
  [ToolName.planPodcast]: ReturnType<typeof planPodcastTool>;
  [ToolName.createSubAgent]: ReturnType<typeof createSubAgentTool>;
  [ToolName.toolCallError]: typeof toolCallError;
}>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type StudyToolSetCheck = StudyToolSet extends ToolSet ? true : false;
