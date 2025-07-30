import { convertDBMessagesToAIMessages } from "@/ai/messageUtils";
import { fetchInterviewSessionDetails } from "@/app/(interviewProject)/actions";
import { throwServerActionError } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NextResponse } from "next/server";
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

export default async function SessionPage({
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
  const { projectId, sessionId } = validatedParams;

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
