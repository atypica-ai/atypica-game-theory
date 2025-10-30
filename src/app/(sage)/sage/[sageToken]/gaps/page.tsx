import authOptions from "@/app/(auth)/authOptions";
import { getSageByToken } from "@/app/(sage)/lib";
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
  const result = await getSageByToken(sageToken);
  if (!result) {
    return {};
  }
  const { sage } = result;
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

  const result = await getSageByToken(token);

  if (!result) {
    notFound();
  }

  const { sage } = result;

  // Check ownership
  if (sage.userId !== session.user.id) {
    forbidden();
  }

  // Fetch knowledge gaps for this sage
  const gaps = await prisma.sageKnowledgeGap.findMany({
    where: { sageId: sage.id },
    orderBy: [{ status: "asc" }, { severity: "asc" }, { createdAt: "desc" }],
  });

  return <GapsTab sage={sage} gaps={gaps} />;
}
