import { fetchPersonaById } from "@/app/(legacy)/personas/actions";
import { checkAdminAuth } from "@/app/admin/utils";
import { notFound } from "next/navigation";
import { AgentChatPage } from "../../AgentChatPage";

export const dynamic = "force-dynamic";

export default async function ScoutAgentPage({ params }: { params: Promise<{ id: string }> }) {
  await checkAdminAuth("SUPER_ADMIN");
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
      initialMessages={[]}
      useChatAPI="/api/chat/persona"
      persistMessages={false}
    />
  );
}
