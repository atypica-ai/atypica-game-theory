import { AgentStatisticsExtra } from "@/prisma/client";
import { Locale } from "next-intl";
import { Logger } from "pino";

import { AudienceCallResult, AudienceCallToolInput } from "./experts/audienceCall/types";
import { BuildPersonaToolInput, BuildPersonaToolResult } from "./experts/buildPersona/types";
import { InterviewChatResult, InterviewChatToolInput } from "./experts/interviewChat/types";
import { PlanStudyResult, PlanStudyToolInput } from "./experts/planStudy/types";
import { ReasoningThinkingResult, ReasoningThinkingToolInput } from "./experts/reasoning/types";
import { GenerateReportResult, GenerateReportToolInput } from "./experts/report/types";
import {
  ScoutSocialTrendsResult,
  ScoutSocialTrendsToolInput,
} from "./experts/scoutSocialTrends/types";
import { ScoutTaskChatResult, ScoutTaskChatToolInput } from "./experts/scoutTaskChat/types";
import { SearchPersonasToolInput, SearchPersonasToolResult } from "./experts/searchPersonas/types";
import { WebSearchToolInput, WebSearchToolResult } from "./experts/webSearch/types";
import { SocialPostCommentToolResult, SocialPostToolResult } from "./social/types";
import {
  SaveAnalystToolInput,
  SaveAnalystToolResult,
  SaveInnovationSummaryToolResult,
} from "./system/saveAnalyst/types";
import { SaveInterviewConclusionToolResult } from "./system/saveInterviewConclusion/types";
import { SavePersonaToolResult } from "./system/savePersona/types";
import { RequestInteractionResult } from "./user/interaction/types";
import { RequestPaymentResult } from "./user/payment/types";
import { ThanksResult } from "./user/thanks/types";

// export * from "./experts/buildPersona/types";
// export * from "./experts/interviewChat/types";
// export * from "./experts/reasoning/types";
// export * from "./experts/report/types";
// export * from "./experts/scoutSocialTrends/types";
// export * from "./experts/scoutTaskChat/types";
// export * from "./experts/searchPersonas/types";

// export * from "./system/saveAnalyst/types";
// export * from "./system/saveInterviewConclusion/types";
// export * from "./system/savePersona/types";

// export * from "./user/interaction/types";
// export * from "./user/payment/types";
// export * from "./user/thanks/types";

// export * from "./social/types";

// export * from "./social/dy/postComments/types";
// export * from "./social/dy/search/types";
// export * from "./social/dy/userPosts/types";
// export * from "./social/ins/postComments/types";
// export * from "./social/ins/search/types";
// export * from "./social/ins/userPosts/types";
// export * from "./social/tiktok/postComments/types";
// export * from "./social/tiktok/search/types";
// export * from "./social/tiktok/userPosts/types";
// export * from "./social/xhs/noteComments/types";
// export * from "./social/xhs/search/types";
// export * from "./social/xhs/userNotes/types";

export interface PlainTextToolResult {
  plainText: string;
}

export enum ToolName {
  planStudy = "planStudy",
  interviewChat = "interviewChat",
  generateReport = "generateReport",
  reasoningThinking = "reasoningThinking",
  searchPersonas = "searchPersonas",
  scoutTaskChat = "scoutTaskChat",
  buildPersona = "buildPersona",
  scoutSocialTrends = "scoutSocialTrends",
  audienceCall = "audienceCall",

  saveAnalyst = "saveAnalyst",
  saveAnalystStudySummary = "saveAnalystStudySummary",
  saveInterviewConclusion = "saveInterviewConclusion",
  savePersona = "savePersona",
  saveInterviewSessionSummary = "saveInterviewSessionSummary",
  updateInterviewProject = "updateInterviewProject",

  requestInteraction = "requestInteraction",
  requestPayment = "requestPayment",
  thanks = "thanks",

  webSearch = "webSearch",

  xhsNoteComments = "xhsNoteComments",
  xhsSearch = "xhsSearch",
  xhsUserNotes = "xhsUserNotes",
  dySearch = "dySearch",
  dyPostComments = "dyPostComments",
  dyUserPosts = "dyUserPosts",
  tiktokSearch = "tiktokSearch",
  tiktokPostComments = "tiktokPostComments",
  tiktokUserPosts = "tiktokUserPosts",
  insSearch = "insSearch",
  insUserPosts = "insUserPosts",
  insPostComments = "insPostComments",
  twitterSearch = "twitterSearch",
  twitterUserPosts = "twitterUserPosts",
  twitterPostComments = "twitterPostComments",

  toolCallError = "toolCallError",
}

export type UIToolConfigs = {
  [ToolName.planStudy]: { input: PlanStudyToolInput; output: PlanStudyResult };
  [ToolName.interviewChat]: { input: InterviewChatToolInput; output: InterviewChatResult };
  [ToolName.generateReport]: { input: GenerateReportToolInput; output: GenerateReportResult };
  [ToolName.reasoningThinking]: {
    input: ReasoningThinkingToolInput;
    output: ReasoningThinkingResult;
  };
  [ToolName.searchPersonas]: { input: SearchPersonasToolInput; output: SearchPersonasToolResult };
  [ToolName.scoutTaskChat]: { input: ScoutTaskChatToolInput; output: ScoutTaskChatResult };
  [ToolName.buildPersona]: { input: BuildPersonaToolInput; output: BuildPersonaToolResult };
  [ToolName.scoutSocialTrends]: {
    input: ScoutSocialTrendsToolInput;
    output: ScoutSocialTrendsResult;
  };
  [ToolName.audienceCall]: { input: AudienceCallToolInput; output: AudienceCallResult };
  [ToolName.saveAnalyst]: { input: SaveAnalystToolInput; output: SaveAnalystToolResult };
  [ToolName.saveAnalystStudySummary]: { input: unknown; output: SaveInnovationSummaryToolResult };
  [ToolName.saveInterviewConclusion]: { input: unknown; output: SaveInterviewConclusionToolResult };
  [ToolName.savePersona]: { input: unknown; output: SavePersonaToolResult };
  [ToolName.saveInterviewSessionSummary]: { input: unknown; output: PlainTextToolResult };
  [ToolName.updateInterviewProject]: { input: unknown; output: PlainTextToolResult };
  [ToolName.requestInteraction]: { input: unknown; output: RequestInteractionResult };
  [ToolName.requestPayment]: { input: unknown; output: RequestPaymentResult };
  [ToolName.thanks]: { input: unknown; output: ThanksResult };
  [ToolName.webSearch]: { input: WebSearchToolInput; output: WebSearchToolResult };
  [ToolName.xhsNoteComments]: { input: unknown; output: SocialPostCommentToolResult };
  [ToolName.xhsSearch]: { input: unknown; output: SocialPostToolResult };
  [ToolName.xhsUserNotes]: { input: unknown; output: SocialPostToolResult };
  [ToolName.dySearch]: { input: unknown; output: SocialPostToolResult };
  [ToolName.dyPostComments]: { input: unknown; output: SocialPostCommentToolResult };
  [ToolName.dyUserPosts]: { input: unknown; output: SocialPostToolResult };
  [ToolName.tiktokSearch]: { input: unknown; output: SocialPostToolResult };
  [ToolName.tiktokPostComments]: { input: unknown; output: SocialPostCommentToolResult };
  [ToolName.tiktokUserPosts]: { input: unknown; output: SocialPostToolResult };
  [ToolName.insSearch]: { input: unknown; output: SocialPostToolResult };
  [ToolName.insUserPosts]: { input: unknown; output: SocialPostToolResult };
  [ToolName.insPostComments]: { input: unknown; output: SocialPostCommentToolResult };
  [ToolName.twitterSearch]: { input: unknown; output: SocialPostToolResult };
  [ToolName.twitterUserPosts]: { input: unknown; output: SocialPostToolResult };
  [ToolName.twitterPostComments]: { input: unknown; output: SocialPostCommentToolResult };
  [ToolName.toolCallError]: { input: unknown; output: PlainTextToolResult };
};

export type StatReporter = (
  dimension: "tokens" | "duration" | "steps" | "personas",
  value: number,
  extra: AgentStatisticsExtra,
) => Promise<void>;

export type AgentToolConfigArgs = {
  locale: Locale;
  abortSignal: AbortSignal;
  statReport: StatReporter;
  logger: Logger;
};
