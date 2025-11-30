import authOptions from "@/app/(auth)/authOptions";
import { SageExtra } from "@/app/(sage)/types";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import type { Metadata } from "next";
import { getServerSession, Session } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { forbidden } from "next/navigation";
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

async function SageChatsPage({
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

  // Fetch all chats associated with this sage through SageChat table
  const sageChats = await prisma.sageChat.findMany({
    where: {
      sageId: sage.id,
      userId: sessionUser.id,
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

  return <SageChatsPageClient sage={sage} chats={chats} />;
}

export default async function SageChatsPageWithLoading({
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
      <SageChatsPage sageToken={token} sessionUser={session.user} />
    </Suspense>
  );
}
