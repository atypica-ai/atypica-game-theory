import { fetchUserChatByIdAction } from "@/app/(agents)/agents/actions";
import { AgentChatPage } from "@/app/(agents)/agents/AgentChatPage";
import { TSimpleAgentMessageWithTool } from "@/app/(agents)/tools/types";
import { checkTezignAuth } from "@/app/admin/actions";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { prisma } from "@/prisma/prisma";
import { notFound } from "next/navigation";
import { Suspense } from "react";

// 因为 build 阶段用户没有登录，所以不会进入 NewStudyPlanningPage，因此不需要设置 dynamic
// export const dynamic = "force-dynamic";

async function InterviewAgentPage({ userChatId }: { userChatId: number }) {
  // server action 已经确保所有权
  const result = await fetchUserChatByIdAction(userChatId, "interview");
  if (!result.success) {
    notFound();
  }
  const userChat = result.data;

  const interview = await prisma.analystInterview.findUniqueOrThrow({
    where: {
      interviewUserChatId: userChat.id,
    },
    select: {
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
      userChatToken={userChat.token}
      chatTitle={userChat.title}
      nickname={{ user: "Inteviewer", assistant: interview.persona?.name }}
      avatar={{
        user: <HippyGhostAvatar className="size-8" seed={"Interviewer"} />,
        assistant: <HippyGhostAvatar className="size-8" seed={interview.persona?.id} />,
      }}
      initialMessages={userChat.messages as TSimpleAgentMessageWithTool[]}
      readOnly={true}
    />
  );
}

export default async function InterviewAgentPageWithLoading({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await checkTezignAuth(); // tezign 内部测试功能

  const userChatId = parseInt((await params).id);
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <InterviewAgentPage userChatId={userChatId} />
    </Suspense>
  );
}
