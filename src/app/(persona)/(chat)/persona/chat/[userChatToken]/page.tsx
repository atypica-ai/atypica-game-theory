import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import authOptions from "@/app/(auth)/authOptions";
import { fetchUserPersonaChatByToken } from "@/app/(persona)/actions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import { Message } from "ai";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PersonaChatClient } from "./PersonaChatClient";

// generateMetadata 需要访问数据库
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userChatToken: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("PersonaImport.personaChat");
  const { userChatToken } = await params;
  if (!userChatToken) {
    return {};
  }
  const result = await fetchUserPersonaChatByToken(userChatToken);
  if (!result.success) {
    return {};
  }
  const { persona } = result.data;
  return generatePageMetadata({
    title: `${t("chatWith")} ${persona.name}`,
    description: `${t("haveConversation")} ${persona.name} - ${persona.source}`,
    locale,
  });
}

async function PersonaChatTokenPage({ userChatToken }: { userChatToken: string }) {
  const result = await fetchUserPersonaChatByToken(userChatToken);
  if (!result.success) {
    if (result.code === "not_found") {
      notFound();
    }
    // For unauthorized or forbidden, we could redirect to login or show access denied
    // For now, let's just show not found to avoid exposing chat existence
    notFound();
  }
  const { userChat, persona } = result.data;

  // Fetch existing chat messages
  const messages: Message[] = (
    await prisma.chatMessage.findMany({
      where: { userChatId: userChat.id },
      orderBy: { id: "asc" },
    })
  ).map(convertDBMessageToAIMessage);

  return (
    <PersonaChatClient userChatToken={userChatToken} persona={persona} initialMessages={messages} />
  );
}

export default async function PersonaChatTokenPageWithLoading({
  params,
}: {
  params: Promise<{ userChatToken: string }>;
}) {
  const { userChatToken } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/persona/chat/${userChatToken}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PersonaChatTokenPage userChatToken={userChatToken} />
    </Suspense>
  );
}
