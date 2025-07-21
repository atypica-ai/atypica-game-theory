import { fetchPersonaById } from "@/app/(persona)/actions";
import { checkTezignAuth } from "@/app/admin/actions";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { notFound } from "next/navigation";
import { AgentChatPage } from "../../AgentChatPage";

export const dynamic = "force-dynamic";

export default async function ScoutAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await checkTezignAuth(); // 内部人员可以和 persona 聊天
  const personaId = parseInt((await params).id);
  const result = await fetchPersonaById(personaId);
  if (!result.success) {
    notFound();
  }
  const persona = result.data;
  return (
    <AgentChatPage
      chatId={persona.id.toString()}
      chatTitle={persona.name}
      nickname={{ user: user.email, assistant: persona.name }}
      avatar={{
        user: <HippyGhostAvatar className="size-8" seed={user.id} />,
        assistant: <HippyGhostAvatar className="size-8" seed={persona.id} />,
      }}
      initialMessages={[]}
      useChatAPI="/api/chat/persona"
      persistMessages={false}
    />
  );
}
