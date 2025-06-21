import { AgentChatPage } from "@/app/(agents)/agents/AgentChatPage";
import { fetchUserChatByIdAction } from "@/app/(agents)/agents/actions";
import { checkTezignAuth } from "@/app/admin/actions";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { forbidden, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ScoutAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await checkTezignAuth(); // 内部人员可以和 acout agent 聊天
  const userChatId = parseInt((await params).id);

  const result = await fetchUserChatByIdAction(userChatId, "scout");
  if (!result.success) {
    notFound();
  }
  const userChat = result.data;

  if (userChat.userId !== user.id) {
    forbidden();
  }

  return (
    <AgentChatPage
      chatId={userChat.id.toString()}
      chatTitle={userChat.title}
      nickname={{ user: user.email, assistant: "atypica.AI" }}
      avatar={{
        user: <HippyGhostAvatar className="size-8" seed={user.id} />,
        assistant: <HippyGhostAvatar className="size-8" seed={userChat.id} />,
      }}
      initialMessages={userChat.messages}
      useChatAPI="/api/chat/scout"
    />
  );
}
