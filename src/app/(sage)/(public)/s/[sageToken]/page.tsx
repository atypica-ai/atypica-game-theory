import authOptions from "@/app/(auth)/authOptions";
import { convertDBMessagesToAIMessages } from "@/ai/messageUtils";
import { TSageMessageWithTool } from "@/app/(sage)/types";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { prisma } from "@/prisma/prisma";
import { UIMessage } from "ai";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getSageByToken } from "../../../lib";
import { PublicSageView } from "./PublicSageView";

async function PublicSagePage({
  params,
}: {
  params: Promise<{
    sageToken: string;
  }>;
}) {
  const sageToken = (await params).sageToken;
  const session = await getServerSession(authOptions);

  const sage = await getSageByToken(sageToken);

  if (!sage) {
    notFound();
  }

  // Check if sage is public (unless user is owner)
  const isOwner = !!(session?.user && sage.userId === session.user.id);
  if (!sage.isPublic && !isOwner) {
    notFound();
  }

  // Check if Memory Document is ready
  if (!sage.memoryDocument) {
    notFound();
  }

  // Get or create chat session if user is logged in
  let userChat = null;
  let messages: UIMessage[] = [];

  if (session?.user) {
    // Try to find existing chat
    const existingChat = await prisma.sageChat.findFirst({
      where: {
        sageId: sage.id,
        userId: session.user.id,
      },
      include: {
        userChat: true,
      },
    });

    if (existingChat) {
      userChat = existingChat.userChat;

      // Fetch existing chat messages
      const dbMessages = await prisma.chatMessage.findMany({
        where: { userChatId: userChat.id },
        orderBy: { id: "asc" },
      });
      messages = await convertDBMessagesToAIMessages(dbMessages, {
        convertObjectUrl: "HttpUrl",
      });
    }
  }

  return (
    <PublicSageView
      sage={sage}
      isOwner={isOwner}
      userChat={userChat}
      initialMessages={messages as TSageMessageWithTool[]}
      isAuthenticated={!!session?.user}
    />
  );
}

export default async function PublicSagePageWithLoading({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PublicSagePage params={params} />
    </Suspense>
  );
}
