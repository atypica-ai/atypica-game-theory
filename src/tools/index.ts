import { prisma } from "@/lib/prisma";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { interviewChatTool } from "./experts/interviewChat";
import { reasoningThinkingTool } from "./experts/reasoning";
import { generateReportTool } from "./experts/report";
import { scoutTaskChatTool, scoutTaskCreateTool } from "./experts/scoutTask";
import { saveAnalystStudySummaryTool, saveAnalystTool } from "./system/saveAnalyst";
import { saveInterviewConclusionTool } from "./system/saveInterviewConclusion";
import { savePersonaTool } from "./system/savePersona";
import { requestInteractionTool } from "./user/interaction";
import { requestPaymentTool } from "./user/payment";
import { thanksTool } from "./user/thanks";
import { xhsNoteCommentsTool } from "./xhs/noteComments";
import { xhsSearchTool } from "./xhs/search";
import { xhsUserNotesTool } from "./xhs/userNotes";

export enum ToolName {
  interviewChat = "interviewChat",
  generateReport = "generateReport",
  reasoningThinking = "reasoningThinking",
  requestInteraction = "requestInteraction",
  requestPayment = "requestPayment",
  saveAnalyst = "saveAnalyst",
  saveAnalystStudySummary = "saveAnalystStudySummary",
  saveInterviewConclusion = "saveInterviewConclusion",
  savePersona = "savePersona",
  scoutTaskChat = "scoutTaskChat",
  scoutTaskCreate = "scoutTaskCreate",
  thanks = "thanks",
  xhsNoteComments = "xhsNoteComments",
  xhsSearch = "xhsSearch",
  xhsUserNotes = "xhsUserNotes",
}

export {
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
  scoutTaskCreateTool,
  thanksTool,
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
