import { convertDBMessagesToAIMessages } from "@/ai/messageUtils";
import { fetchInterviewSessionByChatToken } from "@/app/(interviewProject)/actions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { throwServerActionError } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { InterviewSessionChatClient } from "./InterviewSessionChatClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("InterviewProject.sessionChat");
  return {
    title: t("interviewDetails"),
  };
}

async function InterviewSessionChatPage({
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

export default async function InterviewSessionChatPageWithLoading({
  params,
}: {
  params: Promise<{ userChatToken: string }>;
}) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <InterviewSessionChatPage params={params} />
    </Suspense>
  );
}
