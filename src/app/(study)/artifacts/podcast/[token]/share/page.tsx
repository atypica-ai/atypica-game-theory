import { fetchPodcastByToken } from "@/app/(study)/artifacts/podcast/actions";
import { reportCoverObjectUrlToHttpUrl } from "@/app/(study)/artifacts/report/actions";
import { proxiedImageCdnUrl } from "@/app/(system)/cdn/lib";
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
    return result;
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

  const result = await getCachedPodcastData(podcastToken);
  if (!result.success) {
    return {};
  }

  const { podcast, analyst, studyUserChat, report } = result.data;

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
    const result = await reportCoverObjectUrlToHttpUrl(report);
    if (result) {
      // 国内和国外都用 CDN，用同一个 CDN
      image = proxiedImageCdnUrl({
        src: result.signedCoverObjectUrl,
      });
    }
  }

  return generatePageMetadata({ title, description, locale, image });
}

async function PodcastSharePage({ podcastToken }: { podcastToken: string }) {
  const result = await getCachedPodcastData(podcastToken);
  if (!result.success) {
    notFound();
  }
  const { podcast, analyst, studyUserChat, report } = result.data;

  // Get cover image URL if report exists
  let coverImageUrl: string | undefined;
  if (report) {
    const coverResult = await reportCoverObjectUrlToHttpUrl(report);
    if (coverResult) {
      coverImageUrl = coverResult.signedCoverObjectUrl;
    }
  }

  const title = podcast.extra.metadata?.title || studyUserChat.title;

  return (
    <PodcastSharePageClient
      podcastToken={podcastToken}
      analyst={analyst}
      title={title}
      studyUserChatToken={studyUserChat.token}
      script={podcast.script}
      coverImageUrl={coverImageUrl}
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
