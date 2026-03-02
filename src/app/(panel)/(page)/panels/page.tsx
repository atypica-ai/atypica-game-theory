import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PersonaPanelsListClient } from "./PanelsListClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PersonaPanel");
  const locale = await getLocale();
  return generatePageMetadata({
    title: t("title"),
    description: t("subtitle"),
    locale,
  });
}

interface PanelListPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function PanelListPage({ searchParams }: PanelListPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = "/panels";
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <PersonaPanelsListClient initialSearchParams={initialSearchParams} />;
}

export default async function PanelListPageWithLoading(props: PanelListPageProps) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PanelListPage searchParams={props.searchParams} />
    </Suspense>
  );
}
