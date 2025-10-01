import { fetchUserChatByIdAction } from "@/app/(agents)/agents/actions";
import authOptions from "@/app/(auth)/authOptions";
import { checkTezignAuth } from "@/app/admin/actions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { getServerSession } from "next-auth/next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { BuildPersonaStreamObjectClient } from "./BuildPersonaStreamObjectClient";

// 因为 build 阶段用户没有登录，所以不会进入 BuildPersonaStreamObjectPage，这里不需要设置 dynamic
// export const dynamic = "force-dynamic";

async function BuildPersonaStreamObjectPage({
  userChatId,
  // sessionUserId,
}: {
  userChatId: number;
  sessionUserId: number;
}) {
  // 其实这个 server action 已经确保了用户所有权了
  const result = await fetchUserChatByIdAction(userChatId, "scout");
  if (!result.success) {
    notFound();
  }
  // const userChat = result.data;
  // if (userChat.userId !== sessionUserId) {
  //   forbidden();
  // }

  return (
    <BuildPersonaStreamObjectClient
      chatId={userChatId.toString()}
      useObjectAPI={`/api/chat/scout/buildStreamObject`}
    />
  );
}

export default async function BuildPersonaStreamObjectPageWithLoading({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await checkTezignAuth(); // 内部人员可以和 acout agent 聊天

  const userChatId = parseInt((await params).id);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/agents/scout/${userChatId}/buildStreamObject`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <BuildPersonaStreamObjectPage userChatId={userChatId} sessionUserId={session.user.id} />
    </Suspense>
  );
}
