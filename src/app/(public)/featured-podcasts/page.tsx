import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PodcastsClient } from "./PodcastsClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("FeaturedPodcastsPage");
  return {
    title: t("title"),
  };
}

async function FeaturedPodcastsPage() {
  return <PodcastsClient />;
}

export default async function FeaturedPodcastsPageWithLoading() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <FeaturedPodcastsPage />
    </Suspense>
  );
}
