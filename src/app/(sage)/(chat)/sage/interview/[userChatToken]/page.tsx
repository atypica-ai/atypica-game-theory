import { convertDBMessagesToAIMessages } from "@/ai/messageUtils";
import authOptions from "@/app/(auth)/authOptions";
import { SageExtra, SageInterviewExtra, TSageMessageWithTool } from "@/app/(sage)/types";
import { Forbidden } from "@/components/Forbidden";
import { NotFound } from "@/components/NotFound";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { Sage, SageInterview } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { UIMessage } from "ai";
import { getServerSession } from "next-auth";
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
    // forbidden(); // Cannot use forbidden() inside Suspense boundary - it throws an error that Suspense catches, causing page interaction issues
    // Instead, return a Forbidden component directly
    return <Forbidden />;
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
    // notFound(); // Cannot use notFound() inside Suspense boundary - it throws an error that Suspense catches, causing page interaction issues
    // Instead, return a NotFound component directly
    return <NotFound />;
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
    // forbidden(); // Cannot use forbidden() inside Suspense boundary - it throws an error that Suspense catches, causing page interaction issues
    // Instead, return a Forbidden component directly
    return <Forbidden />;
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
