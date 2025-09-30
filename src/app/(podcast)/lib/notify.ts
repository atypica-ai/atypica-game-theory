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
  analystId,
  podcast,
  logger,
}: {
  analystId: number;
  podcast: Pick<AnalystPodcast, "token">;
  logger: Logger;
}): Promise<void> {
  // cronjob 是使用域名调用 batch generate api 的，所以也可以拿到 origin
  const siteOrigin = await getRequestOrigin();

  const analyst = await prisma.analyst.findUnique({
    where: { id: analystId },
    select: {
      id: true,
      locale: true,
      topic: true,
      studyUserChat: {
        select: {
          token: true,
          title: true,
          user: { select: { email: true } },
        },
      },
    },
  });

  if (!analyst?.studyUserChat) {
    return;
  }

  const recipientEmail = analyst.studyUserChat.user.email;
  if (!recipientEmail) {
    logger.info("Podcast ready notification skipped: missing recipient email");
    return;
  }

  const locale: Locale =
    analyst.locale && VALID_LOCALES.includes(analyst.locale as Locale)
      ? (analyst.locale as Locale)
      : await getLocale();

  const studyTitle = truncateForTitle(analyst.studyUserChat.title || analyst.topic || "", {
    maxDisplayWidth: 100,
    suffix: "...",
  });

  const podcastUrl = `${siteOrigin}/artifacts/podcast/${podcast.token}/share`;
  const studyUrl = `${siteOrigin}/study/${analyst.studyUserChat.token}/share`;

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
