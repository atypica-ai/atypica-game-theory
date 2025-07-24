import authOptions from "@/app/(auth)/authOptions";
import { fetchInterviewSessionByChatToken } from "@/app/(interviewProject)/actions";
import { prisma } from "@/prisma/prisma";
import { Message } from "ai";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { InterviewSessionChatClient } from "./InterviewSessionChatClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userChatToken: string }>;
}): Promise<Metadata> {
  const { userChatToken } = await params;
  const result = await fetchInterviewSessionByChatToken(userChatToken);
  if (!result.success) {
    return {};
  }
  const session = result.data;
  const isPersonaInterview = !!session.intervieweePersona;
  return {
    title: `Interview Session - ${isPersonaInterview ? session.intervieweePersona?.name : "Human Interview"}`,
    description: `Interview session for project: ${session.project.brief.slice(0, 160)}`,
  };
}

export default async function InterviewSessionChatPage({
  params,
}: {
  params: Promise<{ userChatToken: string }>;
}) {
  const { userChatToken } = await params;

  const authSession = await getServerSession(authOptions);

  // Redirect to login if not authenticated
  if (!authSession?.user) {
    const returnUrl = encodeURIComponent(`/interview/session/chat/${userChatToken}`);
    redirect(`/auth/signin?callbackUrl=${returnUrl}`);
  }

  const userId = authSession.user.id;

  const result = await fetchInterviewSessionByChatToken(userChatToken);
  if (!result.success) {
    // 不管什么错误，统一返回 404
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const interviewSession = result.data;

  // Check access permission
  const hasAccess =
    interviewSession.project.userId === userId || // Project owner
    interviewSession.intervieweeUserId === userId; // Interviewee

  if (!hasAccess) {
    // redirect("/projects");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get existing messages for this chat
  const initialMessages = await prisma.chatMessage
    .findMany({
      where: { userChatId: interviewSession.userChat.id },
      orderBy: { createdAt: "asc" },
      select: {
        messageId: true,
        role: true,
        content: true,
        parts: true,
        createdAt: true,
      },
    })
    .then((messages) =>
      messages
        // .filter((msg) => msg.content !== "[READY]") // Filter out initialization message
        .map((msg) => ({
          id: msg.messageId,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          parts: msg.parts as Message["parts"],
          createdAt: msg.createdAt,
        })),
    );
  return (
    <InterviewSessionChatClient
      interviewSession={interviewSession}
      initialMessages={initialMessages}
    />
  );
}
