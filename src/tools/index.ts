import { prisma } from "@/lib/prisma";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { interviewChatTool } from "./experts/interviewChat";
import { reasoningThinkingTool } from "./experts/reasoning";
import { generateReportTool } from "./experts/report";
import { scoutTaskChatTool } from "./experts/scoutTask";
import { dyPostCommentsTool } from "./social/dy/postComments";
import { dySearchTool } from "./social/dy/search";
import { dyUserPostsTool } from "./social/dy/userPosts";
import { tiktokPostCommentsTool } from "./social/tiktok/postComments";
import { tiktokSearchTool } from "./social/tiktok/search";
import { tiktokUserPostsTool } from "./social/tiktok/userPosts";
import { xhsNoteCommentsTool } from "./social/xhs/noteComments";
import { xhsSearchTool } from "./social/xhs/search";
import { xhsUserNotesTool } from "./social/xhs/userNotes";
import { saveAnalystStudySummaryTool, saveAnalystTool } from "./system/saveAnalyst";
import { saveInterviewConclusionTool } from "./system/saveInterviewConclusion";
import { savePersonaTool } from "./system/savePersona";
import { requestInteractionTool } from "./user/interaction";
import { requestPaymentTool } from "./user/payment";
import { thanksTool } from "./user/thanks";

export enum ToolName {
  interviewChat = "interviewChat",
  generateReport = "generateReport",
  reasoningThinking = "reasoningThinking",
  scoutTaskChat = "scoutTaskChat",

  saveAnalyst = "saveAnalyst",
  saveAnalystStudySummary = "saveAnalystStudySummary",
  saveInterviewConclusion = "saveInterviewConclusion",
  savePersona = "savePersona",

  requestInteraction = "requestInteraction",
  requestPayment = "requestPayment",
  thanks = "thanks",

  xhsNoteComments = "xhsNoteComments",
  xhsSearch = "xhsSearch",
  xhsUserNotes = "xhsUserNotes",
  dySearch = "dySearch",
  dyPostComments = "dyPostComments",
  dyUserPosts = "dyUserPosts",
  tiktokSearch = "tiktokSearch",
  tiktokPostComments = "tiktokPostComments",
  tiktokUserPosts = "tiktokUserPosts",
}

export {
  dyPostCommentsTool,
  dySearchTool,
  dyUserPostsTool,
  generateReportTool,
  interviewChatTool,
  reasoningThinkingTool,
  requestInteractionTool,
  requestPaymentTool,
  saveAnalystStudySummaryTool,
  saveAnalystTool,
  saveInterviewConclusionTool,
  savePersonaTool,
  scoutTaskChatTool,
  thanksTool,
  tiktokPostCommentsTool,
  tiktokSearchTool,
  tiktokUserPostsTool,
  xhsNoteCommentsTool,
  xhsSearchTool,
  xhsUserNotesTool,
};

export type StatReporter = (
  dimension: "tokens" | "duration" | "steps" | "personas",
  value: number,
  extra?: unknown,
) => Promise<void>;

export const initStatReporter = (studyUserChatId: number): { statReport: StatReporter } => {
  const statReport: StatReporter = async (dimension, value, extra) => {
    await prisma.chatStatistics.create({
      data: {
        userChatId: studyUserChatId,
        dimension,
        value,
        extra: extra as InputJsonValue,
      },
    });
  };
  return { statReport };
};
