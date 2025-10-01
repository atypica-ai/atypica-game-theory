import authOptions from "@/app/(auth)/authOptions";
import { validateInterviewShareToken } from "@/app/(interviewProject)/lib";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { InviteInterviewClient } from "./InviteInterviewClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("InterviewProject.shareInvite");
  const locale = await getLocale();
  return generatePageMetadata({
    title: t("title"),
    description: t("description"),
    locale,
  });
}

async function SharePage({ shareToken }: { shareToken: string }) {
  const session = await getServerSession(authOptions);
  // Validate the share token
  const projectInfo = await validateInterviewShareToken(shareToken);
  if (!projectInfo) {
    notFound();
  }
  return (
    <InviteInterviewClient
      shareToken={shareToken}
      projectInfo={projectInfo}
      user={session?.user || null}
    />
  );
}

export default async function SharePageWithLoading({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SharePage shareToken={shareToken} />
    </Suspense>
  );
}
