import authOptions from "@/app/(auth)/authOptions";
import { fetchInterviewSession } from "@/app/(interviewProject)/actions";
import { InterviewSessionViewer } from "@/app/(interviewProject)/components/InterviewSessionViewer";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string; sessionId: string }>;
}): Promise<Metadata> {
  const { sessionId: sessionIdStr } = await params;
  if (!sessionIdStr) {
    return {};
  }
  const sessionId = parseInt(sessionIdStr, 10);

  if (isNaN(sessionId)) {
    return {
      title: "Session Not Found",
      description: "This interview session is not available.",
    };
  }

  const result = await fetchInterviewSession(sessionId);

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
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ projectId: string; sessionId: string }>;
}) {
  const { projectId: projectIdStr, sessionId: sessionIdStr } = await params;
  if (!projectIdStr || !sessionIdStr) {
    notFound();
  }

  const authSession = await getServerSession(authOptions);

  // Redirect to login if not authenticated
  if (!authSession?.user) {
    const returnUrl = encodeURIComponent(`/projects/${projectIdStr}/sessions/${sessionIdStr}`);
    redirect(`/auth/signin?callbackUrl=${returnUrl}`);
  }

  const sessionId = parseInt(sessionIdStr, 10);
  const projectId = parseInt(projectIdStr, 10);

  // Validate IDs
  if (isNaN(sessionId) || isNaN(projectId)) {
    notFound();
  }

  // Get interview session details
  const result = await fetchInterviewSession(sessionId);

  if (!result.success) {
    if (result.code === "not_found") {
      notFound();
    }
    throw new Error(result.message || "Failed to load interview session");
  }

  const session = result.data;

  // Verify the session belongs to the correct project
  if (session.projectId !== projectId) {
    notFound();
  }

  // Check if user has access to this session (only project owner can view in readonly mode)
  const userId = authSession.user.id;
  const isProjectOwner = session.project.userId === userId;

  if (!isProjectOwner) {
    // If not project owner, redirect to the interactive chat page instead
    if (session.userChat?.token) {
      redirect(`/chat/${session.userChat.token}`);
    }
    redirect("/projects");
  }

  // Get existing messages for this chat
  const initialMessages = session.userChat
    ? await prisma.chatMessage
        .findMany({
          where: { userChatId: session.userChat.id },
          orderBy: { createdAt: "asc" },
          select: {
            messageId: true,
            role: true,
            content: true,
            createdAt: true,
          },
        })
        .then((messages) =>
          messages
            .filter((msg) => msg.content !== "[READY]") // Filter out initialization message
            .map((msg) => ({
              id: msg.messageId,
              role: msg.role as "user" | "assistant",
              content: msg.content,
              createdAt: msg.createdAt,
            })),
        )
    : [];

  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mx-auto" />
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mx-auto" />
          </div>
        </div>
      }
    >
      <InterviewSessionViewer session={session} initialMessages={initialMessages} />
    </Suspense>
  );
}
