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

async function FeaturedPodcastsPage() {
  return <FeaturedPodcastsClient />;
}

export default async function FeaturedPodcastsPageWithLoading() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <FeaturedPodcastsPage />
    </Suspense>
  );
}
