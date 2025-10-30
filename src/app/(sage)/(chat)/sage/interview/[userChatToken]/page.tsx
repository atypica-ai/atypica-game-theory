import { convertDBMessagesToAIMessages } from "@/ai/messageUtils";
import authOptions from "@/app/(auth)/authOptions";
import { SageExtra, SageInterviewExtra, TSageMessageWithTool } from "@/app/(sage)/types";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { Sage, SageInterview } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { UIMessage } from "ai";
import { getServerSession } from "next-auth";
import { forbidden, notFound } from "next/navigation";
import { Suspense } from "react";
import { SageInterviewClient } from "./SageInterviewClient";

async function SageInterviewPage({
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
      sageInterview: {
        include: {
          sage: true,
        },
      },
    },
  });

  if (!userChat || !userChat.sageInterview) {
    notFound();
  }

  const { sage, ...interview } = userChat.sageInterview as Omit<SageInterview, "extra"> & {
    extra: SageInterviewExtra;
    sage: Omit<Sage, "expertise" | "extra"> & {
      expertise: string[];
      extra: SageExtra;
    };
  };

  // Check ownership
  if (sage.userId !== session.user.id) {
    forbidden();
  }

  // Fetch existing chat messages
  const dbMessages = await prisma.chatMessage.findMany({
    where: { userChatId: userChat.id },
    orderBy: { id: "asc" },
  });
  const messages: UIMessage[] = await convertDBMessagesToAIMessages(dbMessages, {
    convertObjectUrl: "HttpUrl",
  });

  return (
    <SageInterviewClient
      userChatToken={userChatToken}
      sage={sage}
      interview={interview}
      initialMessages={messages as TSageMessageWithTool[]}
    />
  );
}

export default async function SageInterviewPageWithLoading({
  params,
}: {
  params: Promise<{ userChatToken: string }>;
}) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SageInterviewPage params={params} />
    </Suspense>
  );
}
