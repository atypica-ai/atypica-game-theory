import { checkTezignAuth } from "@/app/admin/utils";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { authOptions } from "@/lib/auth";
import { fetchUserChatById } from "@/lib/data/UserChat";
import { getServerSession } from "next-auth/next";
import { forbidden, notFound, redirect } from "next/navigation";
import { AgentChatPage } from "../../AgentChatPage";

export const dynamic = "force-dynamic";

export default async function ScoutAgentPage({ params }: { params: Promise<{ id: string }> }) {
  await checkTezignAuth(); // 内部人员可以和 acout agent 聊天
  const userChatId = parseInt((await params).id);

  const result = await fetchUserChatById(userChatId, "scout");
  if (!result.success) {
    notFound();
  }
  const userChat = result.data;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/agents/scout/${userChatId}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (userChat.userId !== session.user.id) {
    forbidden();
  }

  return (
    <AgentChatPage
      chatId={userChat.id.toString()}
      chatTitle={userChat.title}
      nickname={{ user: session.user.email, assistant: "atypica.AI" }}
      avatar={{
        user: <HippyGhostAvatar className="size-8" seed={session.user.id} />,
        assistant: <HippyGhostAvatar className="size-8" seed={userChat.id} />,
      }}
      initialMessages={userChat.messages}
      useChatAPI="/api/chat/scout"
    />
  );
}
