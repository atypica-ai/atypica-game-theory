import { sendReportCompletionEmail } from "@/email/reportCompletion";
import { sendStudyInterruptionEmail } from "@/email/studyInterruption";
import { getRequestOrigin } from "@/lib/request/headers";
import { truncateForTitle } from "@/lib/textUtils";
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
  if (!studyUserChat.user.email) {
    // TODO: team user 没有邮箱，需要取出 personalUser 的 邮箱，目前先跳过
    return;
  }
  await sendReportCompletionEmail({
    email: studyUserChat.user.email,
    topic: truncateForTitle(report.analyst.topic, {
      maxDisplayWidth: 100,
      suffix: "...",
    }),
    studyUrl: `${siteOrigin}/study/${studyUserChat.token}`,
  });
}

export async function notifyStudyInterruption({}: { studyUserChatId: number; studyLog: Logger }) {
  // 暂停发送错误邮件
  return;
}

export async function _notifyStudyInterruption({
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
  if (!studyUserChat.user.email) {
    // TODO: team user 没有邮箱，需要取出 personalUser 的 邮箱，目前先跳过
    return;
  }
  await sendStudyInterruptionEmail({
    email: studyUserChat.user.email,
    topic: truncateForTitle(studyUserChat.analyst?.topic ?? "", {
      maxDisplayWidth: 100,
      suffix: "...",
    }),
    studyUrl: `${siteOrigin}/study/${studyUserChat.token}`,
  });
}
