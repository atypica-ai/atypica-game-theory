import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { InterviewProjectsClient } from "./InterviewProjectsClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("InterviewProject.projectsList");
  const locale = await getLocale();
  return generatePageMetadata({
    title: t("title"),
    locale,
  });
}

interface InterviewProjectsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function InterviewProjectsPage({ searchParams }: InterviewProjectsPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = "/interview/projects";
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <InterviewProjectsClient isCreateEnabled={true} initialSearchParams={initialSearchParams} />;
}

export default async function InterviewProjectsPageWithLoading(props: InterviewProjectsPageProps) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <InterviewProjectsPage searchParams={props.searchParams} />
    </Suspense>
  );
}
