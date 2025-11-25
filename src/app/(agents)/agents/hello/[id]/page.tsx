import { fetchUserChatByIdAction } from "@/app/(agents)/agents/actions";
import { TSimpleAgentMessageWithTool } from "@/app/(agents)/tools/types";
import authOptions from "@/app/(auth)/authOptions";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { throwServerActionError } from "@/lib/serverAction";
import { Session } from "next-auth";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AgentChatPage } from "../../AgentChatPage";

export const dynamic = "force-dynamic";

async function HelloAgentPage({
  userChatId,
  sessionUser,
}: {
  userChatId: number;
  sessionUser: NonNullable<Session["user"]>;
}) {
  const result = await fetchUserChatByIdAction(userChatId, "misc");
  if (!result.success) {
    throwServerActionError(result);
  }
  const userChat = result.data;
  return (
    <AgentChatPage
      userChatToken={userChat.token}
      chatTitle={userChat.title}
      nickname={{ user: sessionUser.email, assistant: "atypica.AI" }}
      avatar={{
        user: <HippyGhostAvatar className="size-8" seed={sessionUser.id} />,
        assistant: <HippyGhostAvatar className="size-8" seed={userChat.id} />,
      }}
      initialMessages={userChat.messages as TSimpleAgentMessageWithTool[]}
      useChatAPI="/api/chat/hello"
    />
  );
}

export default async function HelloAgentPageWithLoading({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userChatId = parseInt((await params).id);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/agents/hello/${userChatId}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <HelloAgentPage userChatId={userChatId} sessionUser={session.user} />
    </Suspense>
  );
}
