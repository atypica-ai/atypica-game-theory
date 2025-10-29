import authOptions from "@/app/(auth)/authOptions";
import { convertDBMessagesToAIMessages } from "@/ai/messageUtils";
import { TSageMessageWithTool } from "@/app/(sage)/types";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { prisma } from "@/prisma/prisma";
import { UIMessage } from "ai";
import { getServerSession } from "next-auth";
import { forbidden, notFound } from "next/navigation";
import { Suspense } from "react";
import { getSageByToken } from "../../../../lib";
import { SageChatClient } from "./SageChatClient";

async function SageChatPage({
  params,
}: {
  params: Promise<{
    userChatToken: string;
  }>;
}) {
  const userChatToken = (await params).userChatToken;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    forbidden();
  }

  const userChat = await prisma.userChat.findUnique({
    where: { token: userChatToken },
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

  // Check access permission
  if (userChat.userId !== session.user.id) {
    const sage = userChat.sageChat.sage;
    if (!sage.isPublic) {
      forbidden();
    }
  }

  const result = await getSageByToken(userChat.sageChat.sage.token);
  if (!result) {
    notFound();
  }

  const { sage } = result;

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
      initialMessages={messages as TSageMessageWithTool[]}
    />
  );
}

export default async function SageChatPageWithLoading({
  params,
}: {
  params: Promise<{ userChatToken: string }>;
}) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SageChatPage params={params} />
    </Suspense>
  );
}
