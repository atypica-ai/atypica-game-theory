import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { InterviewProjectsClient } from "./InterviewProjectsClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("InterviewProject.projectsList");
  return {
    title: t("title"),
  };
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
