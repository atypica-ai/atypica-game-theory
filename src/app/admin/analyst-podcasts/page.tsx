import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { AnalystPodcastsPageClient } from "./AnalystPodcastsPageClient";

interface AnalystPodcastsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AnalystPodcastsPage({ searchParams }: AnalystPodcastsPageProps) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <AnalystPodcastsPageClient initialSearchParams={initialSearchParams} />;
}
