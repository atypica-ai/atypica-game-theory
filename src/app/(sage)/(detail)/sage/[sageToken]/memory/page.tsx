import authOptions from "@/app/(auth)/authOptions";
import { EpisodicMemoryReference, WorkingMemoryItem } from "@/app/(sage)/types";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import type { Metadata } from "next";
import { getServerSession, Session } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { forbidden } from "next/navigation";
import { JSX, Suspense } from "react";
import { SageMemoryPageClient } from "./SageMemoryPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Sage.PageMetadata");
  return generatePageMetadata({
    title: t("memoryTitle"),
    description: t("memoryDescription"),
    locale,
  });
}

async function SageMemoryPage({
  sageToken,
  sessionUser,
}: {
  sageToken: string;
  sessionUser: NonNullable<Session["user"]>;
}): Promise<JSX.Element> {
  const sageMemoryDocument = await prisma.sageMemoryDocument.findFirst({
    where: {
      sage: {
        token: sageToken,
        userId: sessionUser.id, // ensure user owns the sage
      },
    },
    select: {
      content: true,
      core: true,
      working: true,
      episodic: true,
    },
    orderBy: { version: "desc" },
    take: 1,
  });

  return (
    <SageMemoryPageClient
      sageMemoryDocument={
        sageMemoryDocument
          ? {
              core: sageMemoryDocument.core,
              working: sageMemoryDocument.working as WorkingMemoryItem[],
              episodic: sageMemoryDocument.episodic as EpisodicMemoryReference[],
            }
          : null
      }
    />
  );
}

export default async function SageMemoryPageWithLoading({
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
      <SageMemoryPage sageToken={token} sessionUser={session.user} />
    </Suspense>
  );
}
