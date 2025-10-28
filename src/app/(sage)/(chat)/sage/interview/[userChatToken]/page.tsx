import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { forbidden, notFound } from "next/navigation";
import { Suspense } from "react";
import { getSageById } from "../../../../lib";
import { SageInterviewClient } from "./SageInterviewClient";

async function SageInterviewPage({
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
      sageInterview: {
        include: {
          sage: true,
        },
      },
    },
  });

  if (!userChat || !userChat.sageInterview) {
    notFound();
  }

  const interview = userChat.sageInterview;

  // Check ownership
  if (interview.sage.userId !== session.user.id) {
    forbidden();
  }

  const sage = await getSageById(interview.sageId);
  if (!sage) {
    notFound();
  }

  return <SageInterviewClient userChatToken={userChatToken} sage={sage} interview={interview} />;
}

export default async function SageInterviewPageWithLoading({
  params,
}: {
  params: Promise<{ userChatToken: string }>;
}) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SageInterviewPage params={params} />
    </Suspense>
  );
}
