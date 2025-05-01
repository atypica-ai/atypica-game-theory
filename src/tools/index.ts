import { prisma } from "@/lib/prisma";
import { UserTokensLogResourceType, UserTokensLogVerb } from "@prisma/client";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { Logger } from "pino";

export { interviewChatTool } from "./experts/interviewChat";
export { reasoningThinkingTool } from "./experts/reasoning";
export { generateReportTool } from "./experts/report";
export { scoutTaskChatTool } from "./experts/scoutTask";
export { dyPostCommentsTool } from "./social/dy/postComments";
export { dySearchTool } from "./social/dy/search";
export { dyUserPostsTool } from "./social/dy/userPosts";
export { insPostCommentsTool } from "./social/ins/postComments";
export { insSearchTool } from "./social/ins/search";
export { insUserPostsTool } from "./social/ins/userPosts";
export { tiktokPostCommentsTool } from "./social/tiktok/postComments";
export { tiktokSearchTool } from "./social/tiktok/search";
export { tiktokUserPostsTool } from "./social/tiktok/userPosts";
export { xhsNoteCommentsTool } from "./social/xhs/noteComments";
export { xhsSearchTool } from "./social/xhs/search";
export { xhsUserNotesTool } from "./social/xhs/userNotes";
export { saveAnalystStudySummaryTool, saveAnalystTool } from "./system/saveAnalyst";
export { saveInterviewConclusionTool } from "./system/saveInterviewConclusion";
export { savePersonaTool } from "./system/savePersona";
export { requestInteractionTool } from "./user/interaction";
export { requestPaymentTool } from "./user/payment";
export { thanksTool } from "./user/thanks";

export { handleToolCallError, toolCallError } from "./error";

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
  insSearch = "insSearch",
  insUserPosts = "insUserPosts",
  insPostComments = "insPostComments",

  toolCallError = "toolCallError",
}

export type StatReporter = (
  dimension: "tokens" | "duration" | "steps" | "personas",
  value: number,
  extra?: unknown,
) => Promise<void>;

export const initStatReporter = ({
  userId,
  studyUserChatId,
  studyLog,
}: {
  userId: number;
  studyUserChatId: number;
  studyLog: Logger;
}): { statReport: StatReporter } => {
  const statReport: StatReporter = async (dimension, value, extra) => {
    await prisma.chatStatistics.create({
      data: {
        userChatId: studyUserChatId,
        dimension,
        value,
        extra: extra as InputJsonValue,
      },
    });
    if (dimension === "tokens") {
      try {
        await prisma.$transaction([
          prisma.userTokensLog.create({
            data: {
              userId: userId,
              verb: UserTokensLogVerb.consume,
              resourceType: UserTokensLogResourceType.StudyUserChat,
              resourceId: studyUserChatId,
              value: -value,
            },
          }),
          prisma.userTokens.update({
            where: { userId },
            data: {
              balance: {
                decrement: value,
              },
            },
          }),
        ]);
        studyLog.info({ msg: "User tokens consumed successfully", userId, tokens: value });
      } catch (error) {
        studyLog.error({
          msg: `Failed to consume user tokens: ${(error as Error).message}`,
          userId,
          tokens: value,
        });
      }
    }
  };
  return { statReport };
};
