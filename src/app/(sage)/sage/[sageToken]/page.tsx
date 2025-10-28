import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { forbidden, notFound } from "next/navigation";
import { Suspense } from "react";
import { getSageByToken } from "../../lib";
import { SageDetailView } from "./SageDetailView";

async function SageDetailPage({
  params,
}: {
  params: Promise<{
    sageToken: string;
  }>;
}) {
  const token = (await params).sageToken;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    forbidden();
  }

  const sage = await getSageByToken(token);

  if (!sage) {
    notFound();
  }

  // Check ownership
  if (sage.userId !== session.user.id) {
    forbidden();
  }

  // Fetch sage's sources, chats and interviews
  const sources = await prisma.sageSource.findMany({
    where: { sageId: sage.id },
    orderBy: { createdAt: "asc" },
  });

  const chats = await prisma.sageChat.findMany({
    where: { sageId: sage.id },
    include: {
      userChat: {
        select: {
          id: true,
          token: true,
          title: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const interviews = await prisma.sageInterview.findMany({
    where: { sageId: sage.id },
    include: {
      userChat: {
        select: {
          id: true,
          token: true,
          title: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return <SageDetailView sage={sage} sources={sources} chats={chats} interviews={interviews} />;
}

export default async function SageDetailPageWithLoading({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SageDetailPage params={params} />
    </Suspense>
  );
}
