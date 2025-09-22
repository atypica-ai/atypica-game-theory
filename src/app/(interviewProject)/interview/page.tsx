import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import InterviewPageClient from "./InterviewPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("InterviewProject.homepage");
  return { title: t("title") };
}

async function InterviewProjectHomePage() {
  return <InterviewPageClient />;
}

export default async function InterviewProjectHomePageWithLoading() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <InterviewProjectHomePage />
    </Suspense>
  );
}
