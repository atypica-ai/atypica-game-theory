import { SageKnowledgeGapExtra, SageKnowledgeGapSeverity } from "@/app/(sage)/types";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SageGapsPageClient } from "./SageGapsPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Sage.PageMetadata");
  return generatePageMetadata({
    title: t("gapsTitle"),
    description: t("gapsDescription"),
    locale,
  });
}

async function SageGapsPage({ sageToken }: { sageToken: string }) {
  // Get sage id from token (sage full data is available in Client Components via Context)
  const sage = await prisma.sage.findUnique({
    where: { token: sageToken },
    select: { id: true },
  });

  if (!sage) {
    notFound();
  }

  // Fetch knowledge gaps for this sage
  const gaps = (
    await prisma.sageKnowledgeGap.findMany({
      where: { sageId: sage.id },
      orderBy: [{ resolvedAt: "desc" }, { severity: "asc" }, { createdAt: "desc" }],
    })
  ).map(({ severity, extra, ...gap }) => ({
    ...gap,
    severity: severity as SageKnowledgeGapSeverity,
    extra: extra as SageKnowledgeGapExtra,
  }));

  return <SageGapsPageClient gaps={gaps} />;
}

export default async function SageGapsPageWithLoading({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}) {
  const token = (await params).sageToken;
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SageGapsPage sageToken={token} />
    </Suspense>
  );
}
