import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CreateInterviewProjectClient } from "./CreateInterviewProjectClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("InterviewProject.createProject");
  const locale = await getLocale();
  return generatePageMetadata({
    title: t("title"),
    locale,
  });
}

async function CreateInterviewProjectPage() {
  return <CreateInterviewProjectClient />;
}

export default async function CreateInterviewProjectPageWithLoading() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = "/interview/projects/new";
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <CreateInterviewProjectPage />
    </Suspense>
  );
}
