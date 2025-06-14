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
  const [report, studyUserChat] = await Promise.all([
    prisma.analystReport.findUnique({
      where: {
        token: reportToken,
      },
      select: {
        analyst: {
          select: { topic: true },
        },
      },
    }),
    prisma.userChat.findUnique({
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
  if (!report || !studyUserChat) {
    studyLog.error(
      `Something went wrong in notifyReportCompletion, report (${reportToken}) or studyUserChat (${studyUserChatId}) not found`,
    );
    return;
  }
  // 请求一定是前端发起的，虽然 background 运行，上下文里依然有 req 的 headers 信息
  const siteOrigin = await getRequestOrigin();
  await sendReportCompletionEmail({
    email: studyUserChat.user.email,
    topic: report.analyst.topic,
    studyUrl: `${siteOrigin}/study/${studyUserChat.token}`,
  });
}

export async function notifyStudyInterruption({
  studyUserChatId,
  studyLog,
}: {
  studyUserChatId: number;
  studyLog: Logger;
}) {
  const studyUserChat = await prisma.userChat.findUnique({
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
  if (!studyUserChat) {
    studyLog.error(
      `Something went wrong in notifyStudyInterruption, studyUserChat (${studyUserChatId}) not found`,
    );
    return;
  }
  // 请求一定是前端发起的，虽然 background 运行，上下文里依然有 req 的 headers 信息
  const siteOrigin = await getRequestOrigin();
  await sendStudyInterruptionEmail({
    email: studyUserChat.user.email,
    topic: studyUserChat.analyst?.topic ?? "",
    studyUrl: `${siteOrigin}/study/${studyUserChat.token}`,
  });
}
