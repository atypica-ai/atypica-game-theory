import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { truncateForTitle } from "@/lib/textUtils";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { fetchPodcastByToken } from "../../actions";
import PodcastSharePageClient from "./PodcastSharePageClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const { token: podcastToken } = await params;

  const result = await fetchPodcastByToken(podcastToken);

  if (!result.success) {
    return {};
  }

  const { analyst, studyUserChat } = result.data;

  const title =
    "🎙️ " + truncateForTitle(studyUserChat.title, { maxDisplayWidth: 100, suffix: "..." });

  const description = truncateForTitle(analyst.topic, {
    maxDisplayWidth: 300,
    suffix: "...",
  }).replace(/[\n\r]/g, " ");

  return generatePageMetadata({ title, description, locale });
}

async function PodcastSharePage({ podcastToken }: { podcastToken: string }) {
  const result = await fetchPodcastByToken(podcastToken);
  if (!result.success) {
    notFound();
  }
  const { podcast, analyst, studyUserChat } = result.data;
  return (
    <PodcastSharePageClient
      podcastToken={podcastToken}
      podcast={podcast}
      analyst={analyst}
      studyUserChat={studyUserChat}
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
