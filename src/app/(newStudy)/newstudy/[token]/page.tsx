import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import authOptions from "@/app/(auth)/authOptions";
import { prisma } from "@/prisma/prisma";
import { Message } from "ai";
import { getServerSession } from "next-auth/next";
import { notFound, redirect } from "next/navigation";
import { fetchMiscUserChat } from "../actions";
import { InterviewClient } from "./InterviewClient";

export const dynamic = "force-dynamic";

export default async function NewStudyPlanningPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/newstudy/${token}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const result = await fetchMiscUserChat(token);
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
    <InterviewClient userChat={userChat} initialMessages={initialMessages} user={session.user} />
  );
}
