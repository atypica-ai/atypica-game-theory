import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { FeaturedPodcastsClient } from "./FeaturedPodcastsClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("FeaturedPodcastsPage");
  const locale = await getLocale();
  return generatePageMetadata({
    title: t("title"),
    locale,
  });
}

async function FeaturedPodcastsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialSearchParams: Record<string, string | number> = {};

  if (params.page && typeof params.page === "string") {
    initialSearchParams.page = params.page;
  }

  return <FeaturedPodcastsClient initialSearchParams={initialSearchParams} />;
}

export default async function FeaturedPodcastsPageWithLoading({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <FeaturedPodcastsPage searchParams={searchParams} />
    </Suspense>
  );
}
