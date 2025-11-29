import authOptions from "@/app/(auth)/authOptions";
import { listMySages } from "@/app/(sage)/(public)/actions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SagesListClient } from "./SagesListClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Sage.list");
  const locale = await getLocale();
  return generatePageMetadata({
    title: t("title"),
    locale,
  });
}

async function SagesListPage() {
  const result = await listMySages();
  const sages = result.success ? result.data : [];

  return <SagesListClient sages={sages} />;
}

export default async function SagesListPageWithLoading() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=/sages`);
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SagesListPage />
    </Suspense>
  );
}
