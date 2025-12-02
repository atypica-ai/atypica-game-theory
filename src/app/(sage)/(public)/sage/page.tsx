import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import SageHomePageClient from "./SageHomePageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Sage.CreatePage");
  const locale = await getLocale();
  return generatePageMetadata({
    title: t("title"),
    locale,
  });
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
