import authOptions from "@/app/(auth)/authOptions";
import { getSageByToken } from "@/app/(sage)/lib";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { forbidden, notFound } from "next/navigation";
import { ChatsTab } from "./ChatsTab";

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
    title: `${sage.name} - ${t("chatsTitle")}`,
    description: t("chatsDescription"),
    locale,
  });
}

export default async function SageChatsPage({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}) {
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

  // Fetch all chats associated with this sage through SageChat table
  const sageChats = await prisma.sageChat.findMany({
    where: {
      sageId: sage.id,
      userId: session.user.id,
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

  return <ChatsTab sage={sage} chats={chats} />;
}
