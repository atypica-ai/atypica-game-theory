import { convertDBMessagesToAIMessages } from "@/ai/messageUtils";
import authOptions from "@/app/(auth)/authOptions";
import { saveTeamMemoryAction } from "@/app/team/(detail)/capabilities/actions";
import { MemoryBuilderChatClient } from "@/app/(memory)/(page)/components/MemoryBuilderChatClient";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { prisma } from "@/prisma/prisma";
import { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function ChatPage({
  userChatToken,
  sessionUser,
}: {
  userChatToken: string;
  sessionUser: NonNullable<Session["user"]>;
}) {
  const userChat = await prisma.userChat.findUnique({
    where: { token: userChatToken, kind: "misc" },
  });

  if (!userChat || userChat.userId !== sessionUser.id) {
    redirect("/team/memory-builder");
  }

  const initialMessages = (await convertDBMessagesToAIMessages(
    await prisma.chatMessage.findMany({
      where: { userChatId: userChat.id },
      orderBy: { createdAt: "asc" },
    }),
  )) as Parameters<typeof MemoryBuilderChatClient>[0]["initialMessages"];

  async function saveMemory(content: string) {
    "use server";
    const result = await saveTeamMemoryAction({ content });
    return { success: result.success, message: result.success ? undefined : result.message };
  }

  return (
    <MemoryBuilderChatClient
      mode="team"
      userChatToken={userChatToken}
      initialMessages={initialMessages}
      onSaveMemory={saveMemory}
    />
  );
}

export default async function TeamMemoryBuilderChatPage({
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
      <ChatPage userChatToken={token} sessionUser={session.user} />
    </Suspense>
  );
}
