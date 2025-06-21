import { fetchUserChatByIdAction } from "@/app/(agents)/agents/actions";
import { checkTezignAuth } from "@/app/admin/actions";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { prisma } from "@/prisma/prisma";
import { forbidden, notFound } from "next/navigation";
import { AgentChatPage } from "../../AgentChatPage";

export const dynamic = "force-dynamic";

export default async function InterviewAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await checkTezignAuth(); // 内部人员可以和 persona 聊天

  const userChatId = parseInt((await params).id);
  const result = await fetchUserChatByIdAction(userChatId, "interview");
  if (!result.success) {
    notFound();
  }
  const userChat = result.data;

  if (userChat.userId !== user.id) {
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
