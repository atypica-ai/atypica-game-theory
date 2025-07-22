import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { fetchUserPersonaChatByToken } from "@/app/(persona)/actions";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import { Message } from "ai";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PersonaChatClient } from "./PersonaChatClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userchattoken: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const { userchattoken } = await params;

  if (!userchattoken) {
    return {};
  }

  const result = await fetchUserPersonaChatByToken(userchattoken);
  if (!result.success) {
    return {};
  }

  const { persona } = result.data;

  return generatePageMetadata({
    title: `Chat with ${persona.name}`,
    description: `Have a conversation with ${persona.name} - ${persona.source}`,
    locale,
  });
}

export default async function PersonaChatTokenPage({
  params,
}: {
  params: Promise<{ userChatToken: string }>;
}) {
  const { userChatToken } = await params;

  if (!userChatToken) {
    notFound();
  }

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
