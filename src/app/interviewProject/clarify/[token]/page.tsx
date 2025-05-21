import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import { ToolName } from "@/ai/tools/types";
import { fetchClarifyInterviewSession } from "@/app/interviewProject/actions";
import UserTokensBalance from "@/components/UserTokensBalance";
import { authOptions } from "@/lib/auth";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import { Message } from "ai";
import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { notFound, redirect } from "next/navigation";
import { PageLayout } from "../../PageLayout";
import { BackToProjectButton } from "../../components/BackButtons";
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
    description: interviewSession.project.brief || undefined,
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
  const dbMessages = await prisma.chatMessage.findMany({
    where: { userChatId },
    orderBy: { id: "asc" },
  });
  const checkpoint = dbMessages.findLast((message) => {
    return !!(message.parts as Message["parts"])?.find(
      (part) =>
        part.type === "tool-invocation" &&
        part.toolInvocation.toolName === ToolName.updateInterviewProject,
    );
  });
  const messages = dbMessages.map(convertDBMessageToAIMessage);

  return (
    <PageLayout
      menus={
        <>
          <BackToProjectButton projectToken={interviewSession.project.token} />
          <UserTokensBalance />
        </>
      }
    >
      <ClarifySessionClient
        interviewSession={{ ...interviewSession, userChatId }}
        initialMessages={messages}
        checkpointId={checkpoint?.id}
        user={session.user}
      />
    </PageLayout>
  );
}
