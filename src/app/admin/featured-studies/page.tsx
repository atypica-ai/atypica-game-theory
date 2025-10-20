import { podcastScriptSystem } from "@/app/(podcast)/prompt";
import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { getLocale } from "next-intl/server";
import { Locale } from "next-intl";
import { FeaturedStudiesPageClient } from "./FeaturedStudiesPageClient";

interface FeaturedStudiesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FeaturedStudiesPage({ searchParams }: FeaturedStudiesPageProps) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);
  const locale = await getLocale();
  const defaultPodcastPrompt = podcastScriptSystem({ locale: locale as Locale });

  return (
    <FeaturedStudiesPageClient
      initialSearchParams={initialSearchParams}
      defaultPodcastPrompt={defaultPodcastPrompt}
    />
  );
}
