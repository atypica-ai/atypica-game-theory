import { AgentChatPage } from "@/app/(agents)/agents/AgentChatPage";
import { TSimpleAgentMessageWithTool } from "@/app/(agents)/tools/types";
import { checkTezignAuth } from "@/app/admin/actions";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { NotFound } from "@/components/NotFound";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { Suspense } from "react";
import { fetchDeepResearchUserChatAction } from "../actions";

async function DeepResearchResultPage({ userChatToken }: { userChatToken: string }) {
  const user = await checkTezignAuth();

  // Fetch UserChat with messages
  const result = await fetchDeepResearchUserChatAction(userChatToken);
  if (!result.success) {
    return <NotFound />;
  }

  const { userChat, messages } = result.data;

  // Extract expert type from context field (should always be resolved, no "auto")
  const expertType = userChat.context.deepResearchExpert;

  return (
    <AgentChatPage
      userChatToken={userChat.token}
      chatTitle={`Deep Research (${expertType})`}
      nickname={{ user: user.email, assistant: "atypica.AI" }}
      avatar={{
        user: <HippyGhostAvatar className="size-8" seed={user.id} />,
        assistant: <HippyGhostAvatar className="size-8" seed={userChat.id} />,
      }}
      initialMessages={messages as TSimpleAgentMessageWithTool[]}
      useChatAPI="/api/chat/deepResearch"
    />
  );
}

export default async function DeepResearchResultPageWithLoading({
  params,
}: {
  params: Promise<{ userChatToken: string }>;
}) {
  const userChatToken = (await params).userChatToken;
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <DeepResearchResultPage userChatToken={userChatToken} />
    </Suspense>
  );
}
