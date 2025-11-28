import { fetchUserChatByIdAction } from "@/app/(agents)/agents/actions";
import { AgentChatPage } from "@/app/(agents)/agents/AgentChatPage";
import { TSimpleAgentMessageWithTool } from "@/app/(agents)/tools/types";
import authOptions from "@/app/(auth)/authOptions";
import { checkTezignAuth } from "@/app/admin/actions";
import { NotFound } from "@/components/NotFound";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function BuildPersonaPage({
  userChatId,
  // sessionUserId,
}: {
  userChatId: number;
  sessionUserId: number;
}) {
  await checkTezignAuth(); // 内部人员可以和 acout agent 聊天

  // 这个 server action 已经确保了用户所有权了
  const result = await fetchUserChatByIdAction(userChatId, "scout");
  if (!result.success) {
    // notFound(); // Cannot use notFound() inside Suspense boundary - it throws an error that Suspense catches, causing page interaction issues
    // Instead, return a NotFound component directly
    return <NotFound />;
  }
  const userChat = result.data;

  return (
    <AgentChatPage
      userChatToken={userChat.token}
      chatTitle={userChat.title}
      initialMessages={userChat.messages as TSimpleAgentMessageWithTool[]}
      useChatAPI="/api/chat/scout/build"
    />
  );
}

export default async function BuildPersonaPageWithLoading({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userChatId = parseInt((await params).id);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/agents/scout/${userChatId}/build`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <BuildPersonaPage userChatId={userChatId} sessionUserId={session.user.id} />
    </Suspense>
  );
}
