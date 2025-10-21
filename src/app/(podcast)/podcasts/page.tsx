import { DefaultLayout } from "@/components/layout/DefaultLayout";
import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { Suspense } from "react";
import { PodcastsClient } from "./PodcastsClient";
import { Loader2Icon } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PodcastsPage");
  return {
    title: t("title"),
  };
}

async function PodcastsPage() {
  return <PodcastsClient />;
}

export default async function PodcastsPageWithLoading() {
  return (
    <DefaultLayout header={true} footer={true}>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <PodcastsPage />
      </Suspense>
    </DefaultLayout>
  );
}

