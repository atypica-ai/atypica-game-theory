import { fetchPodcastByToken } from "@/app/(study)/artifacts/podcast/actions";
import { getObjectCdnOrigin } from "@/app/(system)/cdn/lib";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { truncateForTitle } from "@/lib/textUtils";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PodcastSharePageClient from "./PodcastSharePageClient";

export const dynamic = "force-dynamic";

const getCachedPodcastData = unstable_cache(
  async function (podcastToken: string) {
    const result = await fetchPodcastByToken(podcastToken);
    if (!result.success) {
      notFound();
    }
    return result.data;
  },
  ["analyst-podcast-share"], // 基础key + podcastToken参数 = 完整缓存key
  {
    tags: ["analyst-podcast-share"], // 用于批量清除缓存
    revalidate: 3600, // 1小时缓存
  },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const { token: podcastToken } = await params;

  const { podcast, analyst, studyUserChat, report } = await getCachedPodcastData(podcastToken);

  const title =
    "🎙️ " +
    truncateForTitle(podcast.extra.metadata?.title || studyUserChat.title, {
      maxDisplayWidth: 100,
      suffix: "...",
    });

  const description = truncateForTitle(analyst.topic, {
    maxDisplayWidth: 300,
    suffix: "...",
  }).replace(/[\n\r]/g, " ");

  let image: string | undefined;
  if (report) {
    image = `${getObjectCdnOrigin()}/artifacts/report/${report.token}/cover?square=0`;
  }
  return generatePageMetadata({ title, description, locale, image });
}

async function PodcastSharePage({ podcastToken }: { podcastToken: string }) {
  const { podcast, analyst, studyUserChat, report, coverCdnHttpUrl } =
    await getCachedPodcastData(podcastToken);

  const title = podcast.extra.metadata?.title || studyUserChat.title;

  return (
    <PodcastSharePageClient
      podcast={podcast}
      analyst={analyst}
      title={title}
      studyUserChatToken={studyUserChat.token}
      coverCdnHttpUrl={coverCdnHttpUrl}
      reportToken={report?.token}
    />
  );
}

export default async function PodcastSharePageWithLoading({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PodcastSharePage podcastToken={token} />
    </Suspense>
  );
}
