import authOptions from "@/app/(auth)/authOptions";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { fetchInterviewSessionByToken } from "../../actions";
import { InterviewChat } from "../../components/InterviewChat";

interface ChatPageProps {
  params: {
    token: string;
  };
}

export async function generateMetadata({ params }: ChatPageProps): Promise<Metadata> {
  const result = await fetchInterviewSessionByToken(params.token);

  if (!result.success) {
    return {
      title: "Interview Session Not Found",
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

export default async function ChatPage({ params }: ChatPageProps) {
  const authSession = await getServerSession(authOptions);

  // Redirect to login if not authenticated
  if (!authSession?.user) {
    const returnUrl = encodeURIComponent(`/chat/${params.token}`);
    redirect(`/auth/signin?callbackUrl=${returnUrl}`);
  }

  const userId = authSession.user.id;

  // Get interview session details
  const result = await fetchInterviewSessionByToken(params.token);

  if (!result.success) {
    if (result.code === "not_found") {
      notFound();
    }
    throw new Error(result.message || "Failed to load interview session");
  }

  const session = result.data;

  // Check access permission
  const hasAccess =
    session.project.userId === userId || // Project owner
    session.intervieweeUserId === userId; // Interviewee

  if (!hasAccess) {
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
      <InterviewChat session={session} initialMessages={initialMessages} />
    </Suspense>
  );
}
