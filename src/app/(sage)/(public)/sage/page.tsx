import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import SageHomePageClient from "./SageHomePageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Sage.create");
  return { title: t("title") };
}

async function SageHomePage() {
  return <SageHomePageClient />;
}

export default async function SageHomePageWithLoading() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SageHomePage />
    </Suspense>
  );
}
