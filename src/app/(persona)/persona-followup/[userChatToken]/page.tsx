import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { fetchFollowUpInterviewChat } from "@/app/(persona)/actions";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import { Message } from "ai";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import FollowUpInterviewClient from "./FollowUpInterviewClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return generatePageMetadata({
    title: "Follow-up Interview",
    description: "Share your additional insights to improve your persona profile",
    locale,
  });
}

export default async function FollowUpInterviewPage({
  params,
}: {
  params: Promise<{ userChatToken: string }>;
}) {
  const { userChatToken } = await params;
  if (!userChatToken) {
    notFound();
  }

  const result = await fetchFollowUpInterviewChat(userChatToken);
  if (!result.success) {
    notFound();
  }
  const userChat = result.data;

  const userChatId = userChat.id;
  let messages: Message[] | undefined = undefined;
  if (userChatId) {
    messages = (
      await prisma.chatMessage.findMany({
        where: { userChatId },
        orderBy: { id: "asc" },
      })
    ).map(convertDBMessageToAIMessage);
  }

  return <FollowUpInterviewClient userChatToken={userChatToken} initialMessages={messages} />;
}
