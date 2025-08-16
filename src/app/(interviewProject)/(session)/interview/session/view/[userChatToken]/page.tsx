import { convertDBMessagesToAIMessages } from "@/ai/messageUtils";
import { fetchInterviewSessionDetails } from "@/app/(interviewProject)/actions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { throwServerActionError } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { InterviewSessionViewer } from "./InterviewSessionViewer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("InterviewProject.sessionViewer");
  return {
    title: t("sessionTitle"),
  };
}

async function SessionPage({ params }: { params: Promise<{ userChatToken: string }> }) {
  const { userChatToken } = await params;

  // fetchInterviewSessionDetails 里会检查权限
  const result = await fetchInterviewSessionDetails({ userChatToken });
  if (!result.success) {
    throwServerActionError(result);
  }
  const interviewSession = result.data;

  const initialMessages = interviewSession.userChatId
    ? await convertDBMessagesToAIMessages(
        await prisma.chatMessage.findMany({
          where: { userChatId: interviewSession.userChatId },
          orderBy: { id: "asc" },
        }),
      )
    : [];

  return (
    <InterviewSessionViewer interviewSession={interviewSession} initialMessages={initialMessages} />
  );
}

export default async function StudyPageWithLoading({
  params,
}: {
  params: Promise<{ userChatToken: string }>;
}) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SessionPage params={params} />
    </Suspense>
  );
}
