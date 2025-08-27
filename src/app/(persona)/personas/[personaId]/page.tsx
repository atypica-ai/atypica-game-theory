import authOptions from "@/app/(auth)/authOptions";
import { fetchPersonaWithDetails } from "@/app/(persona)/actions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PersonaDetailClient } from "./PersonaDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ personaId: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("PersonaImport.personaDetails");
  const personaId = parseInt((await params).personaId, 10);

  if (isNaN(personaId)) {
    return {};
  }

  const result = await fetchPersonaWithDetails(personaId);

  if (!result.success) {
    return {};
  }

  const { persona } = result.data;
  return generatePageMetadata({
    title: `${t("title")} - ${persona.name}`,
    description: `${t("description")} - ${persona.name}`,
    locale,
  });
}

async function PersonaDetailPage({ personaId }: { personaId: number }) {
  const result = await fetchPersonaWithDetails(personaId);
  if (!result.success) {
    // Gracefully handle not_found, unauthorized, forbidden without leaking info
    notFound();
  }

  const { persona, analysis, personaImportId } = result.data;

  return (
    <PersonaDetailClient persona={persona} analysis={analysis} personaImportId={personaImportId} />
  );
}

export default async function PersonaDetailPageWithLoading({
  params,
}: {
  params: Promise<{ personaId: string }>;
}) {
  const personaId = parseInt((await params).personaId, 10);
  if (isNaN(personaId)) {
    notFound();
  }

  // 当页面放在 Suspense 里的时候，withAuth 里的 redirect exception 可能会导致前端闪现 client error
  // notFound error 没这个问题
  // 所以这里先提前判断下用户是否登录
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/personas/${personaId}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PersonaDetailPage personaId={personaId} />
    </Suspense>
  );
}
