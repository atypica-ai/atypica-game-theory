import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { authOptions } from "@/lib/auth";
import { fetchUserChatById } from "@/lib/data/UserChat";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth/next";
import { forbidden, notFound, redirect } from "next/navigation";
import { AgentChatPage } from "../../AgentChatPage";

export const dynamic = "force-dynamic";

export default async function InterviewAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const userChatId = parseInt((await params).id);

  const result = await fetchUserChatById(userChatId, "interview");
  if (!result.success) {
    notFound();
  }
  const userChat = result.data;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/agents/interview/${userChatId}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (userChat.userId !== session.user.id) {
    forbidden();
  }

  const interview = await prisma.analystInterview.findUniqueOrThrow({
    where: {
      interviewUserChatId: userChat.id,
    },
    select: {
      analyst: {
        select: {
          id: true,
          role: true,
        },
      },
      persona: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return (
    <AgentChatPage
      chatId={userChat.id.toString()}
      chatTitle={userChat.title}
      nickname={{ user: interview.analyst.role, assistant: interview.persona.name }}
      avatar={{
        user: <HippyGhostAvatar className="size-8" seed={interview.analyst.id} />,
        assistant: <HippyGhostAvatar className="size-8" seed={interview.persona.id} />,
      }}
      initialMessages={userChat.messages}
      readOnly={true}
    />
  );
}
