import authOptions from "@/app/(auth)/authOptions";
import {
  SageExtra,
  SageKnowledgeGapExtra,
  SageKnowledgeGapResolvedBy,
  SageKnowledgeGapSeverity,
  SageKnowledgeGapSource,
} from "@/app/(sage)/types";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { forbidden, notFound } from "next/navigation";
import { GapsTab } from "./GapsTab";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Sage.detail.metadata");
  const { sageToken } = await params;

  // Get sage name for metadata
  const sage = await prisma.sage.findUnique({
    where: { token: sageToken },
    select: { name: true },
  });

  if (!sage) {
    return {};
  }

  return generatePageMetadata({
    title: `${sage.name} - ${t("gapsTitle")}`,
    description: t("gapsDescription"),
    locale,
  });
}

export default async function SageGapsPage({ params }: { params: Promise<{ sageToken: string }> }) {
  const token = (await params).sageToken;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    forbidden();
  }

  // Get sage (GapsTab needs full sage object)
  const sageData = await prisma.sage.findUnique({
    where: { token },
  });

  if (!sageData) {
    notFound();
  }

  // Check ownership
  if (sageData.userId !== session.user.id) {
    forbidden();
  }

  const sage = {
    ...sageData,
    extra: sageData.extra as SageExtra,
  };

  // Fetch knowledge gaps for this sage
  const gaps = (
    await prisma.sageKnowledgeGap.findMany({
      where: { sageId: sage.id },
      orderBy: [{ resolvedAt: "desc" }, { severity: "asc" }, { createdAt: "desc" }],
    })
  ).map(({ severity, extra, source, resolvedBy, ...gap }) => ({
    ...gap,
    severity: severity as SageKnowledgeGapSeverity,
    extra: extra as SageKnowledgeGapExtra,
    source: source as SageKnowledgeGapSource,
    resolvedBy: resolvedBy as SageKnowledgeGapResolvedBy,
  }));

  return <GapsTab sage={sage} gaps={gaps} />;
}
