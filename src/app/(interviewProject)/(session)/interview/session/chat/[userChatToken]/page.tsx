import { convertDBMessagesToAIMessages } from "@/ai/messageUtils";
import { fetchInterviewSessionByChatToken } from "@/app/(interviewProject)/actions";
import { throwServerActionError } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { InterviewSessionChatClient } from "./InterviewSessionChatClient";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Interview Session Chat",
  };
}

export default async function InterviewSessionChatPage({
  params,
}: {
  params: Promise<{ userChatToken: string }>;
}) {
  const { userChatToken } = await params;

  // fetchInterviewSessionByChatToken 会检查权限
  const result = await fetchInterviewSessionByChatToken(userChatToken);
  if (!result.success) {
    throwServerActionError(result);
  }

  const interviewSession = result.data;

  // Get existing messages for this chat
  const initialMessages = await convertDBMessagesToAIMessages(
    await prisma.chatMessage.findMany({
      where: { userChatId: interviewSession.userChatId },
      orderBy: { createdAt: "asc" },
    }),
  );
  return (
    <InterviewSessionChatClient
      {...interviewSession}
      userChatToken={userChatToken}
      initialMessages={initialMessages}
    />
  );
}
