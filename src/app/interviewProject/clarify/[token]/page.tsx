import { fetchClarifyInterviewSession } from "@/app/interviewProject/actions";
import { authOptions } from "@/lib/auth";
import { convertDBMessageToAIMessage } from "@/lib/messageUtils";
import { generatePageMetadata } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { notFound, redirect } from "next/navigation";
import { ClarifySessionClient } from "./ClarifySessionClient";

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

  const result = await fetchClarifyInterviewSession(token);
  if (!result.success) {
    return {};
  }
  const interviewSession = result.data;

  return generatePageMetadata({
    title: interviewSession.title,
    description: interviewSession.project.description,
  });
}

export default async function ClarifySessionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/interviewProject/clarify/${token}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const result = await fetchClarifyInterviewSession(token);
  if (!result.success) {
    notFound();
  }
  const interviewSession = result.data;
  // fetchClarifyInterviewSession 里面已经判断了
  // if (interviewSession.project.userId !== session.user.id) {
  //   forbidden();
  // }
  const userChatId = interviewSession.userChatId;
  if (!userChatId) {
    throw new Error("Something went wrong, useChat should exist on clarify session");
  }
  const messages = (
    await prisma.chatMessage.findMany({
      where: { userChatId },
      orderBy: { id: "asc" },
    })
  ).map(convertDBMessageToAIMessage);

  return <ClarifySessionClient interviewSession={interviewSession} initialMessages={messages} />;
}
