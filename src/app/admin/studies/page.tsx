import { podcastScriptSystem } from "@/app/(podcast)/prompt/system";
import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { AdminStudiesPageClient } from "./AdminStudiesPageClient";

interface FeaturedStudiesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FeaturedStudiesPage({ searchParams }: FeaturedStudiesPageProps) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);
  const locale = await getLocale();
  const defaultPodcastPrompt = podcastScriptSystem({
    locale: locale as Locale,
    podcastKind: "deepDive",
  });

  return (
    <AdminStudiesPageClient
      initialSearchParams={initialSearchParams}
      defaultPodcastPrompt={defaultPodcastPrompt}
    />
  );
}
