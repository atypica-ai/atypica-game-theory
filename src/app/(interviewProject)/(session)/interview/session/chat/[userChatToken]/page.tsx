import { convertDBMessagesToAIMessages } from "@/ai/messageUtils";
import authOptions from "@/app/(auth)/authOptions";
import { fetchInterviewSessionChat } from "@/app/(interviewProject)/actions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { throwServerActionError } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { InterviewSessionChatClient } from "./InterviewSessionChatClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("InterviewProject.sessionChat");
  return {
    title: t("interviewDetails"),
  };
}

async function InterviewSessionChatPage({ userChatToken }: { userChatToken: string }) {
  // fetchInterviewSessionChat 会检查权限，但是前面还是要先检查权限，否则 login callback url 不对
  const result = await fetchInterviewSessionChat({ userChatToken });
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
  const { userChatToken } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/interview/session/chat/${userChatToken}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <InterviewSessionChatPage userChatToken={userChatToken} />
    </Suspense>
  );
}
