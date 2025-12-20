import { convertDBMessageToAIMessage } from "@/ai/messageUtils";
import authOptions from "@/app/(auth)/authOptions";
import { fetchFollowUpInterviewChat } from "@/app/(persona)/actions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import FollowUpInterviewClient from "./FollowUpInterviewClient";

// 因为 build 阶段用户没有登录，不会进入 FollowUpInterviewPage，这里不需要 force-dynamic
// export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("PersonaImport.followUpInterview");
  return generatePageMetadata({
    title: t("followUpInterviewTitle"),
    description: t("followUpInterviewDescription"),
    locale,
  });
}

async function FollowUpInterviewPage({ userChatToken }: { userChatToken: string }) {
  const result = await fetchFollowUpInterviewChat(userChatToken);
  if (!result.success) {
    notFound();
  }
  const userChat = result.data;

  const userChatId = userChat.id;
  let initialMessages:
    | Parameters<typeof FollowUpInterviewClient>[0]["initialMessages"]
    | undefined = undefined;
  if (userChatId) {
    initialMessages = (
      await prisma.chatMessage.findMany({
        where: { userChatId },
        orderBy: { id: "asc" },
      })
    ).map(convertDBMessageToAIMessage) as Parameters<
      typeof FollowUpInterviewClient
    >[0]["initialMessages"];
  }

  return (
    <FollowUpInterviewClient userChatToken={userChatToken} initialMessages={initialMessages} />
  );
}

export default async function FollowUpInterviewPageWithLoading({
  params,
}: {
  params: Promise<{ userChatToken: string }>;
}) {
  const { userChatToken } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/persona/followup/${userChatToken}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <FollowUpInterviewPage userChatToken={userChatToken} />
    </Suspense>
  );
}
