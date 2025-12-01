import authOptions from "@/app/(auth)/authOptions";
import {
  SageExtra,
  SageKnowledgeGapExtra,
  SageKnowledgeGapSeverity,
} from "@/app/(sage)/types";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import type { Metadata } from "next";
import { getServerSession, Session } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { forbidden } from "next/navigation";
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

async function SageGapsPage({
  sageToken,
  sessionUser,
}: {
  sageToken: string;
  sessionUser: NonNullable<Session["user"]>;
}) {
  const sage = await prisma.sage
    .findUniqueOrThrow({
      where: { token: sageToken, userId: sessionUser.id },
      select: {
        id: true,
        userId: true,
        extra: true,
      },
    })
    .then(({ extra, ...sage }) => ({ ...sage, extra: extra as SageExtra }));

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

  return <SageGapsPageClient sage={sage} gaps={gaps} />;
}

export default async function SageGapsPageWithLoading({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}) {
  const token = (await params).sageToken;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    forbidden(); // layout 里已经处理过了，这里其实不会出现
  }
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SageGapsPage sageToken={token} sessionUser={session.user} />
    </Suspense>
  );
}
