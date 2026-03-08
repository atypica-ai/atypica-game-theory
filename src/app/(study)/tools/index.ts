import "server-only";

import { toolCallError } from "@/ai/tools/error";
import { readAttachmentTool } from "@/ai/tools/readAttachment";
import { reasoningThinkingTool, webFetchTool, webSearchTool } from "@/ai/tools/tools";
import { StudyToolName } from "@/app/(study)/tools/types";

import { ToolSet } from "ai";
import { audienceCallTool } from "./audienceCall";
import { buildPersonaTool } from "./buildPersona";
import { createSubAgentTool } from "./createSubAgent";
import { discussionChatTool } from "./discussionChat";
import { generatePodcastTool } from "./generatePodcast";
import { generateReportTool } from "./generateReport";
import { interviewChatTool } from "./interviewChat";
import { makeStudyPlanTool } from "./makeStudyPlan";
import { planPodcastTool } from "./planPodcast";
import { planStudyTool } from "./planStudy";
import { requestInteractionTool } from "./requestInteraction";
import { saveAnalystTool } from "./saveAnalyst";
import { scoutSocialTrendsTool } from "./scoutSocialTrends";
import { scoutTaskChatTool } from "./scoutTaskChat";
import { searchPersonasTool } from "./searchPersonas";

export type StudyToolSet = Partial<{
  [StudyToolName.makeStudyPlan]: typeof makeStudyPlanTool;
  [StudyToolName.requestInteraction]: typeof requestInteractionTool;
  [StudyToolName.webFetch]: ReturnType<typeof webFetchTool>;
  [StudyToolName.webSearch]: ReturnType<typeof webSearchTool>;
  [StudyToolName.saveAnalyst]: ReturnType<typeof saveAnalystTool>;
  [StudyToolName.reasoningThinking]: ReturnType<typeof reasoningThinkingTool>;
  [StudyToolName.searchPersonas]: ReturnType<typeof searchPersonasTool>;
  [StudyToolName.scoutTaskChat]: ReturnType<typeof scoutTaskChatTool>;
  [StudyToolName.buildPersona]: ReturnType<typeof buildPersonaTool>;
  [StudyToolName.interviewChat]: ReturnType<typeof interviewChatTool>;
  [StudyToolName.discussionChat]: ReturnType<typeof discussionChatTool>;
  [StudyToolName.generateReport]: ReturnType<typeof generateReportTool>;
  [StudyToolName.generatePodcast]: ReturnType<typeof generatePodcastTool>;
  [StudyToolName.planStudy]: ReturnType<typeof planStudyTool>;
  [StudyToolName.planPodcast]: ReturnType<typeof planPodcastTool>;
  [StudyToolName.audienceCall]: ReturnType<typeof audienceCallTool>;
  [StudyToolName.scoutSocialTrends]: ReturnType<typeof scoutSocialTrendsTool>;
  [StudyToolName.createSubAgent]: ReturnType<typeof createSubAgentTool>;
  [StudyToolName.readAttachment]: ReturnType<typeof readAttachmentTool>;
  [StudyToolName.toolCallError]: typeof toolCallError;
}>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type StudyToolSetCheck = StudyToolSet extends ToolSet ? true : false;

export {
  audienceCallTool,
  buildPersonaTool,
  createSubAgentTool,
  discussionChatTool,
  generatePodcastTool,
  generateReportTool,
  interviewChatTool,
  makeStudyPlanTool,
  planPodcastTool,
  planStudyTool,
  requestInteractionTool,
  saveAnalystTool,
  scoutSocialTrendsTool,
  scoutTaskChatTool,
  searchPersonasTool,
};
