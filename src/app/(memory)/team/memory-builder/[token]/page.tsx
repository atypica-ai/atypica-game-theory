import { convertDBMessagesToAIMessages } from "@/ai/messageUtils";
import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { prisma } from "@/prisma/prisma";
import { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ContextBuilderChatClient } from "./ContextBuilderChatClient";

export const dynamic = "force-dynamic";

async function ContextBuilderChatPage({
  userChatToken,
  sessionUser,
}: {
  userChatToken: string;
  sessionUser: NonNullable<Session["user"]>;
}) {
  const userChat = await prisma.userChat.findUnique({
    where: { token: userChatToken, kind: "misc" },
  });

  if (!userChat) {
    redirect("/team/memory-builder");
  }

  if (userChat.userId !== sessionUser.id) {
    redirect("/team/memory-builder");
  }

  // Get existing messages for this chat
  const initialMessages = (await convertDBMessagesToAIMessages(
    await prisma.chatMessage.findMany({
      where: { userChatId: userChat.id },
      orderBy: { createdAt: "asc" },
    }),
  )) as Parameters<typeof ContextBuilderChatClient>[0]["initialMessages"];

  return <ContextBuilderChatClient userChatToken={userChatToken} initialMessages={initialMessages} />;
}

export default async function ContextBuilderChatPageWithLoading({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/team/memory-builder/${token}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <ContextBuilderChatPage userChatToken={token} sessionUser={session.user} />
    </Suspense>
  );
}
