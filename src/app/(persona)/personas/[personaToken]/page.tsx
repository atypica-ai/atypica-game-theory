import authOptions from "@/app/(auth)/authOptions";
import { fetchPersonaWithDetails } from "@/app/(persona)/actions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getServerSession, Session } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { forbidden, notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PersonaDetailClient } from "./PersonaDetailClient";

// generateMetadata 需要访问数据库
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ personaToken: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("PersonaImport.personaDetails");
  const { personaToken } = await params;
  const result = await fetchPersonaWithDetails(personaToken);
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

async function PersonaDetailPage({
  personaToken,
  sessionUser,
}: {
  personaToken: string;
  sessionUser: NonNullable<Session["user"]>;
}) {
  const result = await fetchPersonaWithDetails(personaToken);
  if (!result.success) {
    // Gracefully handle not_found, unauthorized, forbidden without leaking info
    notFound();
  }

  const { persona, personaImport } = result.data;
  // 其实有了 personaToken 以后，数据是任何人可见的，但是这个页面只针对 personaImport 的 owner，其他情况都应该用 share 页面访问
  if (!personaImport) {
    notFound();
  }
  if (personaImport.userId !== sessionUser.id) {
    forbidden();
  }

  return (
    <PersonaDetailClient
      persona={persona}
      analysis={personaImport?.analysis ?? null}
      personaImportId={personaImport?.id ?? null}
    />
  );
}

export default async function PersonaDetailPageWithLoading({
  params,
}: {
  params: Promise<{ personaToken: string }>;
}) {
  const { personaToken } = await params;

  // 当页面放在 Suspense 里的时候，withAuth 里的 redirect exception 可能会导致前端闪现 client error
  // notFound error 没这个问题
  // 所以这里先提前判断下用户是否登录
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/personas/${personaToken}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PersonaDetailPage personaToken={personaToken} sessionUser={session.user} />
    </Suspense>
  );
}
