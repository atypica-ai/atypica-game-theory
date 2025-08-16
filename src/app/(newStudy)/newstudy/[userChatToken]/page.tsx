import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import authOptions from "@/app/(auth)/authOptions";
import { prisma } from "@/prisma/prisma";
import { Message } from "ai";
import { getServerSession } from "next-auth/next";
import { notFound, redirect } from "next/navigation";
import { fetchMiscUserChat } from "../actions";
import { NewStudyChatClient } from "./NewStudyChatClient";

export const dynamic = "force-dynamic";

export default async function NewStudyPlanningPage({
  params,
}: {
  params: Promise<{ userChatToken: string }>;
}) {
  const { userChatToken } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/newstudy/${userChatToken}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const result = await fetchMiscUserChat(userChatToken);
  if (!result.success) {
    notFound();
  }
  const userChat = result.data;

  const dbMessages = await prisma.chatMessage.findMany({
    where: { userChatId: userChat.id },
    orderBy: { id: "asc" },
  });

  const initialMessages: Message[] = dbMessages.map(convertDBMessageToAIMessage);

  return (
    <NewStudyChatClient userChat={userChat} initialMessages={initialMessages} user={session.user} />
  );
}
