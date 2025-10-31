import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
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

async function InterviewProjectsPage() {
  // let isCreateEnabled = false;
  // try {
  //   await checkTezignAuth();
  //   isCreateEnabled = true;
  // } catch {
  //   // User is not superadmin, upload remains disabled
  //   isCreateEnabled = false;
  //   const session = await getServerSession(authOptions);
  //   if (session?.user) {
  //     const result = await fetchActiveSubscription({
  //       userId: session?.user?.id,
  //     });
  //     if (result.activeSubscription?.plan === "max" || result.activeSubscription?.plan === "team") {
  //       isCreateEnabled = true;
  //     }
  //   }
  // }
  // 全面开放 interviewProject
  return <InterviewProjectsClient isCreateEnabled={true} />;
}

export default async function InterviewProjectsPageWithLoading() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = "/interview/projects";
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <InterviewProjectsPage />
    </Suspense>
  );
}
