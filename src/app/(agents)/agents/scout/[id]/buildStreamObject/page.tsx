import { fetchUserChatByIdAction } from "@/app/(agents)/agents/actions";
import { checkTezignAuth } from "@/app/admin/actions";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { forbidden, notFound, redirect } from "next/navigation";
import { BuildPersonaStreamObjectClient } from "./BuildPersonaStreamObjectClient";

export const dynamic = "force-dynamic";

export default async function BuildPersonaStreamObjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await checkTezignAuth(); // 内部人员可以和 acout agent 聊天
  const userChatId = parseInt((await params).id);

  const result = await fetchUserChatByIdAction(userChatId, "scout");
  if (!result.success) {
    notFound();
  }
  const userChat = result.data;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/agents/scout/${userChatId}/build`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  if (userChat.userId !== session.user.id) {
    forbidden();
  }

  return (
    <BuildPersonaStreamObjectClient
      chatId={userChatId.toString()}
      useObjectAPI={`/api/chat/scout/buildStreamObject`}
    />
  );
}
