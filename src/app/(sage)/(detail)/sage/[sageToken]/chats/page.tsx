import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SageChatsPageClient } from "./SageChatsPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Sage.PageMetadata");
  return generatePageMetadata({
    title: t("chatsTitle"),
    description: t("chatsDescription"),
    locale,
  });
}

async function SageChatsPage({ sageToken }: { sageToken: string }) {
  // Get sage id from token (sage full data is available in Client Components via Context)
  const sage = await prisma.sage.findUnique({
    where: { token: sageToken },
    select: { id: true },
  });

  if (!sage) {
    notFound();
  }

  // Fetch all chats associated with this sage through SageChat table
  const sageChats = await prisma.sageChat.findMany({
    where: {
      sageId: sage.id,
    },
    include: {
      userChat: {
        include: {
          messages: {
            take: 1,
            orderBy: { id: "desc" },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const chats = sageChats.map((sc) => sc.userChat);

  return <SageChatsPageClient chats={chats} />;
}

export default async function SageChatsPageWithLoading({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}) {
  const token = (await params).sageToken;
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SageChatsPage sageToken={token} />
    </Suspense>
  );
}
