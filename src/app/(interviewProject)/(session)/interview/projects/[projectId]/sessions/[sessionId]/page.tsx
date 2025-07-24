import authOptions from "@/app/(auth)/authOptions";
import { fetchInterviewSession } from "@/app/(interviewProject)/actions";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { Message } from "ai";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<z.input<typeof paramsSchema>>;
}): Promise<Metadata> {
  try {
    const { projectId, sessionId } = paramsSchema.parse(await params);

    const result = await fetchInterviewSession({ projectId, sessionId });

    if (!result.success) {
      return {
        title: "Session Not Found",
        description: "This interview session is not available.",
      };
    }

    const session = result.data;
    const isPersonaInterview = !!session.intervieweePersona;

    return {
      title: `Interview Session - ${isPersonaInterview ? session.intervieweePersona?.name : "Human Interview"}`,
      description: `Interview session for project: ${session.project.brief.slice(0, 160)}`,
    };
  } catch (error) {
    return {
      title: "Session Not Found",
      description: "This interview session is not available.",
    };
  }
}

export default async function SessionPage({
  params,
}: {
  params: Promise<z.input<typeof paramsSchema>>;
}) {
  // Validate params with Zod
  let validatedParams;
  try {
    validatedParams = paramsSchema.parse(await params);
  } catch (error) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const { projectId, sessionId } = validatedParams;

  const authSession = await getServerSession(authOptions);
  if (!authSession?.user) {
    const returnUrl = encodeURIComponent(`/projects/${projectId}/sessions/${sessionId}`);
    redirect(`/auth/signin?callbackUrl=${returnUrl}`);
  }

  // Get interview session details
  const result = await fetchInterviewSession({ projectId, sessionId });
  if (!result.success) {
    // 不管是不存在还是权限不足，统一返回 404
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const interviewSession = result.data;
  const userId = authSession.user.id;

  if (interviewSession.project.userId !== userId) {
    rootLogger.error(
      `Something went wrong, user id ${userId} does not match project owner id ${interviewSession.project.userId}`,
    );
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  // Get existing messages for this chat
  const initialMessages = interviewSession.userChat
    ? await prisma.chatMessage
        .findMany({
          where: { userChatId: interviewSession.userChat.id },
          orderBy: { id: "asc" },
          select: {
            messageId: true,
            role: true,
            content: true,
            parts: true,
            createdAt: true,
          },
        })
        .then((messages) =>
          messages.map((msg) => ({
            id: msg.messageId,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            parts: msg.parts as Message["parts"],
            createdAt: msg.createdAt,
          })),
        )
    : [];

  return (
    <InterviewSessionViewer interviewSession={interviewSession} initialMessages={initialMessages} />
  );
}
