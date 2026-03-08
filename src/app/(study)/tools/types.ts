import {
  ReasoningThinkingResult,
  ReasoningThinkingToolInput,
} from "@/ai/tools/experts/reasoningThinking/types";
import { WebFetchToolInput, WebFetchToolResult } from "@/ai/tools/experts/webFetch/types";
import { WebSearchToolInput, WebSearchToolResult } from "@/ai/tools/experts/webSearch/types";
import { SocialPostCommentToolResult, SocialPostToolResult } from "@/ai/tools/social/types";
import { PlainTextToolResult } from "@/ai/tools/types";
import { RequestPaymentResult } from "@/ai/tools/user/payment/types";

import {
  ReadAttachmentToolInput,
  ReadAttachmentToolResult,
} from "@/ai/tools/readAttachment/types";
import { DeepResearchInput, DeepResearchOutput } from "@/app/(deepResearch)/types";
import {
  RequestInteractionResult,
  RequestInteractionToolInput,
} from "@/app/(study)/tools/requestInteraction/types";
import { UIDataTypes, UIMessage } from "ai";
import { AudienceCallResult, AudienceCallToolInput } from "./audienceCall/types";
import { BuildPersonaToolInput, BuildPersonaToolResult } from "./buildPersona/types";
import { CreateSubAgentResult, CreateSubAgentToolInput } from "./createSubAgent/types";
import { DiscussionChatResult, DiscussionChatToolInput } from "./discussionChat/types";
import { GeneratePodcastResult, GeneratePodcastToolInput } from "./generatePodcast/types";
import { GenerateReportResult, GenerateReportToolInput } from "./generateReport/types";
import {
  SaveInterviewConclusionToolInput,
  SaveInterviewConclusionToolResult,
} from "./interviewChat/saveInterviewConclusion/types";
import { InterviewChatResult, InterviewChatToolInput } from "./interviewChat/types";
import { MakeStudyPlanToolInput, MakeStudyPlanToolResult } from "./makeStudyPlan/types";
import { PlanPodcastResult, PlanPodcastToolInput } from "./planPodcast/types";
import { PlanStudyResult, PlanStudyToolInput } from "./planStudy/types";
import { SaveAnalystToolInput, SaveAnalystToolResult } from "./saveAnalyst/types";
import { SavePersonaToolResult } from "./savePersona/types";
import { ScoutSocialTrendsResult, ScoutSocialTrendsToolInput } from "./scoutSocialTrends/types";
import { ScoutTaskChatResult, ScoutTaskChatToolInput } from "./scoutTaskChat/types";
import { SearchPersonasToolInput, SearchPersonasToolResult } from "./searchPersonas/types";

export enum StudyToolName {
  planStudy = "planStudy",
  planPodcast = "planPodcast",
  interviewChat = "interviewChat",
  discussionChat = "discussionChat",
  generateReport = "generateReport",
  generatePodcast = "generatePodcast",
  deepResearch = "deepResearch",
  reasoningThinking = "reasoningThinking",
  searchPersonas = "searchPersonas",
  scoutTaskChat = "scoutTaskChat",
  buildPersona = "buildPersona",
  scoutSocialTrends = "scoutSocialTrends",
  audienceCall = "audienceCall",
  createSubAgent = "createSubAgent",
  readAttachment = "readAttachment",

  makeStudyPlan = "makeStudyPlan",
  saveAnalyst = "saveAnalyst",
  saveInterviewConclusion = "saveInterviewConclusion",
  savePersona = "savePersona",
  saveInterviewSessionSummary = "saveInterviewSessionSummary",
  updateInterviewProject = "updateInterviewProject",

  requestInteraction = "requestInteraction",
  requestPayment = "requestPayment",

  webFetch = "webFetch",
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
  [StudyToolName.planStudy]: { input: PlanStudyToolInput; output: PlanStudyResult };
  [StudyToolName.planPodcast]: { input: PlanPodcastToolInput; output: PlanPodcastResult };
  [StudyToolName.interviewChat]: { input: InterviewChatToolInput; output: InterviewChatResult };
  [StudyToolName.discussionChat]: { input: DiscussionChatToolInput; output: DiscussionChatResult };
  [StudyToolName.generateReport]: { input: GenerateReportToolInput; output: GenerateReportResult };
  [StudyToolName.generatePodcast]: {
    input: GeneratePodcastToolInput;
    output: GeneratePodcastResult;
  };
  [StudyToolName.deepResearch]: { input: DeepResearchInput; output: DeepResearchOutput };
  [StudyToolName.reasoningThinking]: {
    input: ReasoningThinkingToolInput;
    output: ReasoningThinkingResult;
  };
  [StudyToolName.searchPersonas]: {
    input: SearchPersonasToolInput;
    output: SearchPersonasToolResult;
  };
  [StudyToolName.scoutTaskChat]: { input: ScoutTaskChatToolInput; output: ScoutTaskChatResult };
  [StudyToolName.buildPersona]: { input: BuildPersonaToolInput; output: BuildPersonaToolResult };
  [StudyToolName.scoutSocialTrends]: {
    input: ScoutSocialTrendsToolInput;
    output: ScoutSocialTrendsResult;
  };
  [StudyToolName.audienceCall]: { input: AudienceCallToolInput; output: AudienceCallResult };
  [StudyToolName.createSubAgent]: {
    input: CreateSubAgentToolInput;
    output: CreateSubAgentResult;
  };
  [StudyToolName.readAttachment]: {
    input: ReadAttachmentToolInput;
    output: ReadAttachmentToolResult;
  };
  [StudyToolName.saveAnalyst]: { input: SaveAnalystToolInput; output: SaveAnalystToolResult };
  [StudyToolName.saveInterviewConclusion]: {
    input: SaveInterviewConclusionToolInput;
    output: SaveInterviewConclusionToolResult;
  };
  [StudyToolName.savePersona]: { input: GenericInputType; output: SavePersonaToolResult };
  [StudyToolName.saveInterviewSessionSummary]: {
    input: GenericInputType;
    output: PlainTextToolResult;
  };
  [StudyToolName.updateInterviewProject]: { input: GenericInputType; output: PlainTextToolResult };
  [StudyToolName.requestInteraction]: {
    input: RequestInteractionToolInput;
    output: RequestInteractionResult;
  };
  [StudyToolName.requestPayment]: { input: GenericInputType; output: RequestPaymentResult };
  [StudyToolName.makeStudyPlan]: {
    input: MakeStudyPlanToolInput;
    output: MakeStudyPlanToolResult;
  };
  [StudyToolName.webFetch]: { input: WebFetchToolInput; output: WebFetchToolResult };
  [StudyToolName.webSearch]: { input: WebSearchToolInput; output: WebSearchToolResult };
  [StudyToolName.xhsNoteComments]: { input: GenericInputType; output: SocialPostCommentToolResult };
  [StudyToolName.xhsSearch]: { input: GenericInputType; output: SocialPostToolResult };
  [StudyToolName.xhsUserNotes]: { input: GenericInputType; output: SocialPostToolResult };
  [StudyToolName.dySearch]: { input: GenericInputType; output: SocialPostToolResult };
  [StudyToolName.dyPostComments]: { input: GenericInputType; output: SocialPostCommentToolResult };
  [StudyToolName.dyUserPosts]: { input: GenericInputType; output: SocialPostToolResult };
  [StudyToolName.tiktokSearch]: { input: GenericInputType; output: SocialPostToolResult };
  [StudyToolName.tiktokPostComments]: {
    input: GenericInputType;
    output: SocialPostCommentToolResult;
  };
  [StudyToolName.tiktokUserPosts]: { input: GenericInputType; output: SocialPostToolResult };
  [StudyToolName.insSearch]: { input: GenericInputType; output: SocialPostToolResult };
  [StudyToolName.insUserPosts]: { input: GenericInputType; output: SocialPostToolResult };
  [StudyToolName.insPostComments]: { input: GenericInputType; output: SocialPostCommentToolResult };
  [StudyToolName.twitterSearch]: { input: GenericInputType; output: SocialPostToolResult };
  [StudyToolName.twitterUserPosts]: { input: GenericInputType; output: SocialPostToolResult };
  [StudyToolName.twitterPostComments]: {
    input: GenericInputType;
    output: SocialPostCommentToolResult;
  };
  [StudyToolName.toolCallError]: { input: GenericInputType; output: PlainTextToolResult };
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
