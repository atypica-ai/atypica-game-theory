import authOptions from "@/app/(auth)/authOptions";
import { SageAvatar, SageExtra } from "@/app/(sage)/types";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { forbidden, notFound } from "next/navigation";
import { MemoryTab } from "./MemoryTab";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Sage.detail.metadata");
  const { sageToken } = await params;

  // Only need name for metadata
  const sage = await prisma.sage.findUnique({
    where: { token: sageToken },
    select: { name: true },
  });

  if (!sage) {
    return {};
  }

  return generatePageMetadata({
    title: `${sage.name} - ${t("memoryTitle")}`,
    description: t("memoryDescription"),
    locale,
  });
}

export default async function SageMemoryPage({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}) {
  const token = (await params).sageToken;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    forbidden();
  }

  // Get sage with memory document
  const sageData = await prisma.sage.findUnique({
    where: { token },
    include: {
      memoryDocuments: {
        orderBy: { version: "desc" },
        take: 1,
        select: { content: true },
      },
    },
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
    expertise: sageData.expertise as string[],
    extra: sageData.extra as SageExtra,
    avatar: sageData.avatar as SageAvatar,
  };

  const memoryDocument = sageData.memoryDocuments[0]?.content ?? null;

  return <MemoryTab sage={sage} memoryDocument={memoryDocument} />;
}
