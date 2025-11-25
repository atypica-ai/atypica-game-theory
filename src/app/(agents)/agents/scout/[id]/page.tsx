import { AgentChatPage } from "@/app/(agents)/agents/AgentChatPage";
import { fetchUserChatByIdAction } from "@/app/(agents)/agents/actions";
import { TSimpleAgentMessageWithTool } from "@/app/(agents)/tools/types";
import { checkTezignAuth } from "@/app/admin/actions";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { notFound } from "next/navigation";
import { Suspense } from "react";

// export const dynamic = "force-dynamic";

async function ScoutAgentPage({ userChatId }: { userChatId: number }) {
  const user = await checkTezignAuth(); // 内部人员可以和 acout agent 聊天
  // server action 已确保所有权
  const result = await fetchUserChatByIdAction(userChatId, "scout");
  if (!result.success) {
    notFound();
  }
  const userChat = result.data;
  return (
    <AgentChatPage
      userChatToken={userChat.token}
      chatTitle={userChat.title}
      nickname={{ user: user.email, assistant: "atypica.AI" }}
      avatar={{
        user: <HippyGhostAvatar className="size-8" seed={user.id} />,
        assistant: <HippyGhostAvatar className="size-8" seed={userChat.id} />,
      }}
      initialMessages={userChat.messages as TSimpleAgentMessageWithTool[]}
      useChatAPI="/api/chat/scout"
    />
  );
}

export default async function ScoutAgentPageWithLoading({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userChatId = parseInt((await params).id);
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <ScoutAgentPage userChatId={userChatId} />
    </Suspense>
  );
}
