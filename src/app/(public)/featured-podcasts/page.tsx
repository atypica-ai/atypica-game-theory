import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { FeaturedPodcastsClient } from "./FeaturedPodcastsClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("FeaturedPodcastsPage");
  return {
    title: t("title"),
  };
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
