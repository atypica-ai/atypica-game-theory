import { convertDBMessagesToAIMessages } from "@/ai/messageUtils";
import { fetchInterviewSessionDetails } from "@/app/(interviewProject)/actions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { throwServerActionError } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NextResponse } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { InterviewSessionViewer } from "./InterviewSessionViewer";

const paramsSchema = z.object({
  projectId: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      throw new Error("Invalid project ID");
    }
    return num;
  }),
  sessionId: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      throw new Error("Invalid session ID");
    }
    return num;
  }),
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("InterviewProject.sessionViewer");
  return {
    title: t("sessionTitle"),
  };
}

async function SessionPage({
  params: { projectId, sessionId },
}: {
  params: z.infer<typeof paramsSchema>;
}) {
  // fetchInterviewSessionDetails 里会检查权限
  const result = await fetchInterviewSessionDetails({ projectId, sessionId });
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
  params: Promise<z.input<typeof paramsSchema>>;
}) {
  let validatedParams;
  try {
    validatedParams = paramsSchema.parse(await params);
  } catch {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SessionPage params={validatedParams} />
    </Suspense>
  );
}
