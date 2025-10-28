import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { forbidden, notFound } from "next/navigation";
import { Suspense } from "react";
import { getSageByToken } from "../../../../lib";
import { SageChatClient } from "./SageChatClient";

async function SageChatPage({
  params,
}: {
  params: Promise<{
    userChatToken: string;
  }>;
}) {
  const userChatToken = (await params).userChatToken;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    forbidden();
  }

  const userChat = await prisma.userChat.findUnique({
    where: { token: userChatToken },
    include: {
      sageChat: {
        include: {
          sage: true,
        },
      },
    },
  });

  if (!userChat || !userChat.sageChat) {
    notFound();
  }

  // Check access permission
  if (userChat.userId !== session.user.id) {
    const sage = userChat.sageChat.sage;
    if (!sage.isPublic) {
      forbidden();
    }
  }

  const sage = await getSageByToken(userChat.sageChat.sage.token);
  if (!sage) {
    notFound();
  }

  return <SageChatClient userChatToken={userChatToken} sage={sage} />;
}

export default async function SageChatPageWithLoading({
  params,
}: {
  params: Promise<{ userChatToken: string }>;
}) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SageChatPage params={params} />
    </Suspense>
  );
}
