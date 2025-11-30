import { convertDBMessagesToAIMessages } from "@/ai/messageUtils";
import authOptions from "@/app/(auth)/authOptions";
import { SageAvatar, SageExtra, TSageMessageWithTool } from "@/app/(sage)/types";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { prisma } from "@/prisma/prisma";
import { UIMessage } from "ai";
import { getServerSession, Session } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { SageChatClient } from "./SageChatClient";

async function SageChatPage({
  userChatToken,
  sessionUser,
}: {
  userChatToken: string;
  sessionUser: NonNullable<Session["user"]>;
}) {
  const userChat = await prisma.userChat.findUnique({
    where: {
      token: userChatToken,
      userId: sessionUser.id, // ensure user owns the chat
    },
    include: {
      sageChat: {
        include: {
          sage: true,
        },
      },
    },
  });

  if (!userChat || !userChat.sageChat) {
    notFound();
  }

  // Get sage with user info
  const sageData = await prisma.sage.findUnique({
    where: { token: userChat.sageChat.sage.token },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!sageData) {
    notFound();
  }

  const sage = {
    ...sageData,
    expertise: sageData.expertise as string[],
    extra: sageData.extra as SageExtra,
    avatar: sageData.avatar as SageAvatar,
  };

  // Fetch existing chat messages
  const dbMessages = await prisma.chatMessage.findMany({
    where: { userChatId: userChat.id },
    orderBy: { id: "asc" },
  });
  const messages: UIMessage[] = await convertDBMessagesToAIMessages(dbMessages, {
    convertObjectUrl: "HttpUrl",
  });

  return (
    <SageChatClient
      userChatToken={userChatToken}
      sage={sage}
      sageChatId={userChat.sageChat.id}
      initialMessages={messages as TSageMessageWithTool[]}
    />
  );
}

export default async function SageChatPageWithLoading({
  params,
}: {
  params: Promise<{ userChatToken: string }>;
}) {
  const userChatToken = (await params).userChatToken;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/sage/chat/${userChatToken}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SageChatPage userChatToken={userChatToken} sessionUser={session.user} />
    </Suspense>
  );
}
