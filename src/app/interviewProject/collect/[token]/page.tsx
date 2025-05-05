import { fetchCollectInterviewSession } from "@/app/interviewProject/actions";
import { convertDBMessageToAIMessage } from "@/lib/messageUtils";
import { generatePageMetadata } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";
import { Message } from "ai";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectSessionClient } from "./CollectSessionClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  if (!token) {
    return {};
  }

  const result = await fetchCollectInterviewSession(token);
  if (!result.success) {
    return {};
  }
  const interviewSession = result.data;

  return generatePageMetadata({
    title: interviewSession.title,
    description: `Share your insights for ${interviewSession.project.title}`,
  });
}

export default async function CollectSessionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) {
    notFound();
  }

  const result = await fetchCollectInterviewSession(token);
  if (!result.success) {
    notFound();
  }
  const interviewSession = result.data;

  // Check if session is expired
  if (interviewSession.expiresAt && new Date() > new Date(interviewSession.expiresAt)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">This interview has expired</h1>
          <p className="text-muted-foreground">
            The link to this interview is no longer active. Please contact the interview organizer
            if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  const userChatId = interviewSession.userChatId;
  let messages: Message[] | undefined = undefined;
  if (userChatId) {
    messages = (
      await prisma.chatMessage.findMany({
        where: { userChatId },
        orderBy: { id: "asc" },
      })
    ).map(convertDBMessageToAIMessage);
  }

  return <CollectSessionClient interviewSession={interviewSession} initialMessages={messages} />;
}
