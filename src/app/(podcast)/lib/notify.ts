import { sendPodcastReadyEmail } from "@/email/podcastReady";
import { VALID_LOCALES } from "@/i18n/routing";
import { getRequestOrigin } from "@/lib/request/headers";
import { truncateForTitle } from "@/lib/textUtils";
import type { AnalystPodcast } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { Logger } from "pino";

export async function notifyPodcastReady({
  studyUserChatId,
  podcast,
  logger,
}: {
  studyUserChatId: number;
  podcast: Pick<AnalystPodcast, "token">;
  logger: Logger;
}): Promise<void> {
  // cronjob 是使用域名调用 batch generate api 的，所以也可以拿到 origin
  const siteOrigin = await getRequestOrigin();

  const studyUserChat = await prisma.userChat.findUnique({
    where: { id: studyUserChatId, kind: "study" },
    select: {
      id: true,
      token: true,
      title: true,
      context: true,
      extra: true,
      user: { select: { email: true } },
    },
  });

  if (!studyUserChat) {
    return;
  }

  const recipientEmail = studyUserChat.user.email;
  if (!recipientEmail) {
    logger.info("Podcast ready notification skipped: missing recipient email");
    return;
  }

  const locale: Locale =
    studyUserChat.context.defaultLocale &&
    VALID_LOCALES.includes(studyUserChat.context.defaultLocale)
      ? studyUserChat.context.defaultLocale
      : await getLocale();

  const studyTitle = truncateForTitle(
    studyUserChat.title || studyUserChat.context.studyTopic || "",
    {
      maxDisplayWidth: 100,
      suffix: "...",
    },
  );

  const podcastUrl = `${siteOrigin}/artifacts/podcast/${podcast.token}/share`;
  const studyUrl = `${siteOrigin}/study/${studyUserChat.token}/share`;

  try {
    await sendPodcastReadyEmail({
      email: recipientEmail,
      title: studyTitle,
      podcastUrl,
      studyUrl,
      locale,
    });
  } catch (error) {
    logger.error({
      msg: "Failed to send podcast ready email",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
