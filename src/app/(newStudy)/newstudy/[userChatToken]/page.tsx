import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { prisma } from "@/prisma/prisma";
import { UIMessage } from "ai";
import { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { NewStudyChatClient } from "./NewStudyChatClient";

// 因为 build 阶段用户没有登录，所以不会进入 NewStudyPlanningPage，因此不需要设置 dynamic
// export const dynamic = "force-dynamic";

async function NewStudyPlanningPage({
  userChatToken,
  sessionUser,
}: {
  userChatToken: string;
  sessionUser: NonNullable<Session["user"]>;
}) {
  const userChat = await prisma.userChat.findUnique({
    where: {
      token: userChatToken,
      userId: sessionUser.id,
      kind: "misc",
    },
  });

  if (!userChat) {
    notFound();
  }

  const dbMessages = await prisma.chatMessage.findMany({
    where: { userChatId: userChat.id },
    orderBy: { id: "asc" },
  });

  const initialMessages: UIMessage[] = dbMessages.map(convertDBMessageToAIMessage);

  return (
    <NewStudyChatClient userChat={userChat} initialMessages={initialMessages} user={sessionUser} />
  );
}

export default async function NewStudyPlanningPageWithLoading({
  params,
}: {
  params: Promise<{ userChatToken: string }>;
}) {
  const { userChatToken } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/newstudy/${userChatToken}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <NewStudyPlanningPage userChatToken={userChatToken} sessionUser={session.user} />
    </Suspense>
  );
}
