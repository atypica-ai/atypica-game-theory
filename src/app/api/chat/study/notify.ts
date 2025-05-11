import { sendReportCompletionEmail } from "@/email/reportCompletion";
import { sendStudyInterruptionEmail } from "@/email/studyInterruption";
import { getRequestOrigin } from "@/lib/request/headers";
import { prisma } from "@/prisma/prisma";
import { Logger } from "pino";

export async function notifyReportCompletion({
  reportToken,
  studyUserChatId,
  studyLog,
}: {
  reportToken: string;
  studyUserChatId: number;
  studyLog: Logger;
}) {
  try {
    const [report, studyUserChat] = await Promise.all([
      prisma.analystReport.findUniqueOrThrow({
        where: {
          token: reportToken,
        },
        select: {
          analyst: {
            select: { topic: true },
          },
        },
      }),
      prisma.userChat.findUniqueOrThrow({
        where: {
          id: studyUserChatId,
          kind: "study",
        },
        select: {
          token: true,
          user: {
            select: { email: true, id: true },
          },
        },
      }),
    ]);
    // 请求一定是前端发起的，虽然 background 运行，上下文里依然有 req 的 headers 信息
    const siteOrigin = await getRequestOrigin();
    await sendReportCompletionEmail({
      email: studyUserChat.user.email,
      topic: report.analyst.topic,
      studyUrl: `${siteOrigin}/study/${studyUserChat.token}`,
    });
  } catch (error) {
    studyLog.error(`Error notifying report completion: ${(error as Error).message}`);
  }
}

export async function notifyStudyInterruption({
  studyUserChatId,
  studyLog,
}: {
  studyUserChatId: number;
  studyLog: Logger;
}) {
  try {
    const studyUserChat = await prisma.userChat.findUniqueOrThrow({
      where: {
        id: studyUserChatId,
        kind: "study",
      },
      select: {
        token: true,
        user: {
          select: { email: true, id: true },
        },
        analyst: {
          select: { topic: true },
        },
      },
    });
    // 请求一定是前端发起的，虽然 background 运行，上下文里依然有 req 的 headers 信息
    const siteOrigin = await getRequestOrigin();
    await sendStudyInterruptionEmail({
      email: studyUserChat.user.email,
      topic: studyUserChat.analyst?.topic ?? "",
      studyUrl: `${siteOrigin}/study/${studyUserChat.token}`,
    });
  } catch (error) {
    studyLog.error(`Error notifying study interruption: ${(error as Error).message}`);
  }
}
