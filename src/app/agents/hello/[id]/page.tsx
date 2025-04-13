import { fetchUserChatById } from "@/data/UserChat";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { forbidden, notFound, redirect } from "next/navigation";
import { AgentChatPage } from "../../AgentChatPage";

export const dynamic = "force-dynamic";

export default async function HelloAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const userChatId = parseInt((await params).id);

  const result = await fetchUserChatById(userChatId, "misc");
  if (!result.success) {
    notFound();
  }
  const userChat = result.data;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/agents/hello/${userChatId}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (userChat.userId !== session.user.id) {
    forbidden();
  }

  return (
    <AgentChatPage
      chatId={userChat.id.toString()}
      chatTitle={userChat.title}
      initialMessages={userChat.messages}
      useChatAPI="/api/chat/hello"
    />
  );
}
