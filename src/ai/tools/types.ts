export * from "./experts/buildPersona/types";
export * from "./experts/interviewChat/types";
export * from "./experts/reasoning/types";
export * from "./experts/report/types";
export * from "./experts/scoutSocialTrends/types";
export * from "./experts/scoutTaskChat/types";
export * from "./experts/searchPersonas/types";

export * from "./system/saveAnalyst/types";
export * from "./system/saveInterviewConclusion/types";
export * from "./system/saveInterviewSessionSummaryTool/types";
export * from "./system/savePersona/types";
export * from "./system/updateInterviewProjectTool/types";

export * from "./user/interaction/types";
export * from "./user/payment/types";
export * from "./user/thanks/types";

export * from "./social/types";

export * from "./social/dy/postComments/types";
export * from "./social/dy/search/types";
export * from "./social/dy/userPosts/types";
export * from "./social/ins/postComments/types";
export * from "./social/ins/search/types";
export * from "./social/ins/userPosts/types";
export * from "./social/tiktok/postComments/types";
export * from "./social/tiktok/search/types";
export * from "./social/tiktok/userPosts/types";
export * from "./social/xhs/noteComments/types";
export * from "./social/xhs/search/types";
export * from "./social/xhs/userNotes/types";

export interface PlainTextToolResult {
  plainText: string;
}

export enum ToolName {
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

export type StatReporter = (
  dimension: "tokens" | "duration" | "steps" | "personas",
  value: number,
  extra: { reportedBy: string } & Record<string, unknown>,
) => Promise<void>;
