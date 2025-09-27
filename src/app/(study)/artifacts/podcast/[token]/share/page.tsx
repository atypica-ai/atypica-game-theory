import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
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

  const { analyst } = result.data;
  const topic = analyst.topic;
  const summary = analyst.studySummary;

  const title = "🎙️ " + (topic.length > 20 ? topic.substring(0, 30) + "..." : topic);
  const description = (summary.length > 100 ? summary.substring(0, 100) + "..." : summary).replace(
    /[\n\r]/g,
    " ",
  );

  return generatePageMetadata({ title, description, locale });
}

export default async function PodcastSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token: podcastToken } = await params;

  const result = await fetchPodcastByToken(podcastToken);

  if (!result.success) {
    notFound();
  }

  const { podcast, analyst, studyReplayUrl } = result.data;

  return (
    <PodcastSharePageClient
      podcastToken={podcastToken}
      podcast={podcast}
      analyst={analyst}
      studyReplayUrl={studyReplayUrl}
    />
  );
}