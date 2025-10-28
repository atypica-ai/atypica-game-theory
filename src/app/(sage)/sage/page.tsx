import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import SageHomePageClient from "./SageHomePageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Sage.homepage");
  return { title: t("title") };
}

async function SageHomePage() {
  // Enable for all users
  return <SageHomePageClient isUploadEnabled={true} />;
}

export default async function SageHomePageWithLoading() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SageHomePage />
    </Suspense>
  );
}
