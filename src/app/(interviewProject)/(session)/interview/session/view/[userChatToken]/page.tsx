import { convertDBMessagesToAIMessages } from "@/ai/messageUtils";
import { fetchInterviewSessionDetails } from "@/app/(interviewProject)/(session)/actions";
import { TInterviewMessageWithTool } from "@/app/(interviewProject)/types";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { throwServerActionError } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { InterviewSessionViewer } from "./InterviewSessionViewer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("InterviewProject.sessionViewer");
  const locale = await getLocale();
  return generatePageMetadata({
    title: t("sessionTitle"),
    locale,
  });
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

  // Get questions from session extra (created when session starts), fallback to project questions
  const questions = interviewSession.extra.questions || interviewSession.project.questions || [];

  return (
    <InterviewSessionViewer
      interviewSession={interviewSession}
      initialMessages={initialMessages as TInterviewMessageWithTool[]}
      questions={questions}
    />
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
