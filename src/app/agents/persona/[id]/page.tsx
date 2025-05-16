import { fetchPersonaById } from "@/app/(legacy)/personas/actions";
import { checkTezignAuth } from "@/app/admin/utils";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { AgentChatPage } from "../../AgentChatPage";

export const dynamic = "force-dynamic";

export default async function ScoutAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const personaId = parseInt((await params).id);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/agents/persona/${personaId}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  await checkTezignAuth(); // 内部人员可以和 persona 聊天
  const result = await fetchPersonaById(personaId);
  if (!result.success) {
    notFound();
  }
  const persona = result.data;
  return (
    <AgentChatPage
      chatId={persona.id.toString()}
      chatTitle={persona.name}
      nickname={{ user: session.user.email, assistant: persona.name }}
      avatar={{
        user: <HippyGhostAvatar className="size-8" seed={session.user.id} />,
        assistant: <HippyGhostAvatar className="size-8" seed={persona.id} />,
      }}
      initialMessages={[]}
      useChatAPI="/api/chat/persona"
      persistMessages={false}
    />
  );
}
