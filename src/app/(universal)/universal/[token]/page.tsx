import authOptions from "@/app/(auth)/authOptions";
import { TUniversalMessageWithTool } from "@/app/(universal)/tools/types";
import { fetchUniversalUserChatByToken } from "@/app/(universal)/universal/actions";
import { extractTasksFromMessages } from "@/app/(universal)/universal/task-vm";
import { Forbidden } from "@/components/Forbidden";
import { DefaultLayout } from "@/components/layout/DefaultLayout";
import { NotFound } from "@/components/NotFound";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { UserChatExtra } from "@/prisma/client";
import { prismaRO } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next/types";
import { Suspense } from "react";
import { UniversalChatPageClient } from "./UniversalChatPageClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const token = (await params).token;
  if (!token) {
    return {};
  }
  const result = await fetchUniversalUserChatByToken(token);
  if (!result.success || !result.data.title) {
    return {};
  }
  return generatePageMetadata({
    title: result.data.title,
    locale,
  });
}

async function UniversalChatContent({ token, userId }: { token: string; userId: number }) {
  const result = await fetchUniversalUserChatByToken(token);

  if (!result.success) {
    return (
      <DefaultLayout header={true} footer={true}>
        <NotFound />
      </DefaultLayout>
    );
  }

  const { messages, ...userChat } = result.data;
  const typedMessages = messages as TUniversalMessageWithTool[];

  if (userChat.userId !== userId) {
    return (
      <DefaultLayout header={true} footer={true}>
        <Forbidden />
      </DefaultLayout>
    );
  }

  const subAgentChatTokens = Array.from(
    new Set(
      extractTasksFromMessages(typedMessages)
        .map((task) => task.subAgentChatToken)
        .filter((token): token is string => !!token),
    ),
  );

  let initialSubAgentRuntimeMap: Record<string, boolean> = {};
  if (subAgentChatTokens.length > 0) {
    const subAgentChats = await prismaRO.userChat.findMany({
      where: {
        userId,
        kind: "study",
        token: {
          in: subAgentChatTokens,
        },
      },
      select: {
        token: true,
        extra: true,
      },
    });
    const runtimeByToken = Object.fromEntries(
      subAgentChats.map((chat) => {
        const extra = chat.extra as UserChatExtra | null;
        return [chat.token, !!extra?.runId] as const;
      }),
    );
    initialSubAgentRuntimeMap = Object.fromEntries(
      subAgentChatTokens.map((token) => [token, runtimeByToken[token] ?? false] as const),
    );
  }

  return (
    <UniversalChatPageClient
      userChat={userChat}
      initialMessages={typedMessages}
      initialSubAgentRuntimeMap={initialSubAgentRuntimeMap}
    />
  );
}

export default async function UniversalChatPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    const callbackUrl = `/universal/${token}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <UniversalChatContent token={token} userId={session.user.id} />
    </Suspense>
  );
}
