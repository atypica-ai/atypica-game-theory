import { sendReportCompletionEmail } from "@/email/reportCompletion";
import { sendStudyInterruptionEmail } from "@/email/studyInterruption";
import { VALID_LOCALES } from "@/i18n/routing";
import { getRequestOrigin } from "@/lib/request/headers";
import { detectInputLanguage, truncateForTitle } from "@/lib/textUtils";
import { AnalystReportExtra } from "@/prisma/client";
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
        extra: true,
      },
    }),
    prisma.userChat.findUnique({
      where: {
        id: studyUserChatId,
        // kind: "study", // 因为有 universal agent, 现在不过滤了
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

  const extra = report.extra as AnalystReportExtra;
  const title = extra?.title || "";
  const description = truncateForTitle(extra.description || "", {
    maxDisplayWidth: 200,
    suffix: "...",
  });
  const locale = await detectInputLanguage({
    text: `${title}\n${description}`,
  });

  await sendReportCompletionEmail({
    email: studyUserChat.user.email,
    title,
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
      // kind: "study", // 因为有 universal agent, 现在不过滤了
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
