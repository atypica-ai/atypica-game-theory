import { sendReportCompletionEmail } from "@/email/reportCompletion";
import { sendStudyInterruptionEmail } from "@/email/studyInterruption";
import { VALID_LOCALES } from "@/i18n/routing";
import { getRequestOrigin } from "@/lib/request/headers";
import { truncateForTitle } from "@/lib/textUtils";
import { prisma } from "@/prisma/prisma";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { Logger } from "pino";

export async function notifyReportCompletion({
  reportToken,
  studyUserChatId,
  logger,
}: {
  reportToken: string;
  studyUserChatId: number;
  logger: Logger;
}) {
  const [report, studyUserChat] = await Promise.all([
    prisma.analystReport.findUnique({
      where: {
        token: reportToken,
      },
      select: {
        analyst: {
          select: { topic: true, locale: true },
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
        title: true,
      },
    }),
  ]);
  if (!report || !studyUserChat) {
    logger.error(
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
  const locale =
    report.analyst.locale && VALID_LOCALES.includes(report.analyst.locale as Locale)
      ? (report.analyst.locale as Locale)
      : await getLocale();
  await sendReportCompletionEmail({
    email: studyUserChat.user.email,
    title: truncateForTitle(studyUserChat.title, {
      maxDisplayWidth: 100,
      suffix: "...",
    }),
    studyUrl: `${siteOrigin}/study/${studyUserChat.token}`,
    locale,
  });
}

export async function notifyStudyInterruption({}: { studyUserChatId: number; logger: Logger }) {
  // 暂停发送错误邮件
  return;
}

export async function _notifyStudyInterruption({
  studyUserChatId,
  logger,
}: {
  studyUserChatId: number;
  logger: Logger;
}) {
  const studyUserChat = await prisma.userChat.findUnique({
    where: {
      id: studyUserChatId,
      kind: "study",
    },
    select: {
      token: true,
      title: true,
      user: {
        select: { email: true, id: true },
      },
      analyst: {
        select: { topic: true, locale: true },
      },
    },
  });
  if (!studyUserChat) {
    logger.error(
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
  const locale =
    studyUserChat.analyst?.locale && VALID_LOCALES.includes(studyUserChat.analyst.locale as Locale)
      ? (studyUserChat.analyst.locale as Locale)
      : await getLocale();
  await sendStudyInterruptionEmail({
    email: studyUserChat.user.email,
    title: truncateForTitle(studyUserChat.title ?? "", {
      maxDisplayWidth: 100,
      suffix: "...",
    }),
    studyUrl: `${siteOrigin}/study/${studyUserChat.token}`,
    locale,
  });
}
