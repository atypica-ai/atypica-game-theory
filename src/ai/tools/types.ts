import { AgentStatisticsExtra } from "@/prisma/client";
import { UIDataTypes, UIMessage } from "ai";
import { Locale } from "next-intl";
import { Logger } from "pino";
import { AudienceCallResult, AudienceCallToolInput } from "./experts/audienceCall/types";
import { BuildPersonaToolInput, BuildPersonaToolResult } from "./experts/buildPersona/types";
import { CreateSubAgentResult, CreateSubAgentToolInput } from "./experts/createSubAgent/types";
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
import {
  SaveInterviewConclusionToolInput,
  SaveInterviewConclusionToolResult,
} from "./system/saveInterviewConclusion/types";
import { SavePersonaToolResult } from "./system/savePersona/types";
import { RequestInteractionResult, RequestInteractionToolInput } from "./user/interaction/types";
import { RequestPaymentResult } from "./user/payment/types";

/**
 * 整个项目约定的 Tool 格式及 UI 类型
 */

export interface PlainTextToolResult {
  plainText: string;
}

// T extends UITools,
export type PlainTextUITools = {
  // Omit<UITool, "input" | "output"> &
  [x: string]: {
    input: Record<any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    output: PlainTextToolResult; // 返回 plainText 字段的 tool 都可以使用
  };
};

export type TMessageWithPlainTextTool<TOOLS extends PlainTextUITools = PlainTextUITools> =
  UIMessage<unknown, UIDataTypes, TOOLS>;

/**
 * 主要用于 AI Study 的 Tool 格式及 UI 类型
 */

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
  biDataAnalysis = "biDataAnalysis",
  createSubAgent = "createSubAgent",

  saveAnalyst = "saveAnalyst",
  saveAnalystStudySummary = "saveAnalystStudySummary",
  saveInterviewConclusion = "saveInterviewConclusion",
  savePersona = "savePersona",
  saveInterviewSessionSummary = "saveInterviewSessionSummary",
  updateInterviewProject = "updateInterviewProject",

  requestInteraction = "requestInteraction",
  requestPayment = "requestPayment",

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

// 因为很多前端组件用不到 tool 的 input，这里就定义一个简单的类型，以避免使用 unknown 或者 any
type GenericInputType = Record<any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type StudyUITools = {
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
  [ToolName.createSubAgent]: {
    input: CreateSubAgentToolInput;
    output: CreateSubAgentResult;
  };
  [ToolName.saveAnalyst]: { input: SaveAnalystToolInput; output: SaveAnalystToolResult };
  [ToolName.saveAnalystStudySummary]: {
    input: GenericInputType;
    output: SaveInnovationSummaryToolResult;
  };
  [ToolName.saveInterviewConclusion]: {
    input: SaveInterviewConclusionToolInput;
    output: SaveInterviewConclusionToolResult;
  };
  [ToolName.savePersona]: { input: GenericInputType; output: SavePersonaToolResult };
  [ToolName.saveInterviewSessionSummary]: { input: GenericInputType; output: PlainTextToolResult };
  [ToolName.updateInterviewProject]: { input: GenericInputType; output: PlainTextToolResult };
  [ToolName.requestInteraction]: {
    input: RequestInteractionToolInput;
    output: RequestInteractionResult;
  };
  [ToolName.requestPayment]: { input: GenericInputType; output: RequestPaymentResult };
  [ToolName.webSearch]: { input: WebSearchToolInput; output: WebSearchToolResult };
  [ToolName.xhsNoteComments]: { input: GenericInputType; output: SocialPostCommentToolResult };
  [ToolName.xhsSearch]: { input: GenericInputType; output: SocialPostToolResult };
  [ToolName.xhsUserNotes]: { input: GenericInputType; output: SocialPostToolResult };
  [ToolName.dySearch]: { input: GenericInputType; output: SocialPostToolResult };
  [ToolName.dyPostComments]: { input: GenericInputType; output: SocialPostCommentToolResult };
  [ToolName.dyUserPosts]: { input: GenericInputType; output: SocialPostToolResult };
  [ToolName.tiktokSearch]: { input: GenericInputType; output: SocialPostToolResult };
  [ToolName.tiktokPostComments]: { input: GenericInputType; output: SocialPostCommentToolResult };
  [ToolName.tiktokUserPosts]: { input: GenericInputType; output: SocialPostToolResult };
  [ToolName.insSearch]: { input: GenericInputType; output: SocialPostToolResult };
  [ToolName.insUserPosts]: { input: GenericInputType; output: SocialPostToolResult };
  [ToolName.insPostComments]: { input: GenericInputType; output: SocialPostCommentToolResult };
  [ToolName.twitterSearch]: { input: GenericInputType; output: SocialPostToolResult };
  [ToolName.twitterUserPosts]: { input: GenericInputType; output: SocialPostToolResult };
  [ToolName.twitterPostComments]: { input: GenericInputType; output: SocialPostCommentToolResult };
  [ToolName.toolCallError]: { input: GenericInputType; output: PlainTextToolResult };
};

export type TStudyMessageWithTool = UIMessage<unknown, UIDataTypes, StudyUITools>;

// ⚠️ 把 ToolUIPart<X> 里面的 X 取出来，比如大部分地方使用的定义在 ai/tools/types.ts 里的 UIToolConfigs
// type InferUIMessageTools<T extends ToolUIPart> =
//   T extends ToolUIPart<infer TOOLS> ? TOOLS : UITools;
export type TAddStudyUIToolResult = <TOOL extends keyof StudyUITools>({
  state,
  tool,
  toolCallId,
  output,
  errorText,
}:
  | {
      state?: "output-available";
      tool: TOOL;
      toolCallId: string;
      output: StudyUITools[TOOL]["output"];
      errorText?: never;
    }
  | {
      state: "output-error";
      tool: TOOL;
      toolCallId: string;
      output?: never;
      errorText: string;
    }) => Promise<void>;

/**
 * stat
 */

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
