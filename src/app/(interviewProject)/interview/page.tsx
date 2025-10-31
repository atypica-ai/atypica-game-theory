import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import InterviewProjectHomePageClient from "./InterviewProjectHomePageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("InterviewProject.homepage");
  const locale = await getLocale();
  return generatePageMetadata({
    title: t("title"),
    locale,
  });
}

async function InterviewProjectHomePage() {
  return <InterviewProjectHomePageClient />;
}

export default async function InterviewProjectHomePageWithLoading() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <InterviewProjectHomePage />
    </Suspense>
  );
}
