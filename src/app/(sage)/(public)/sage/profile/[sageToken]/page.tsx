import authOptions from "@/app/(auth)/authOptions";
import { SageAvatar, SageExtra } from "@/app/(sage)/types";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PublicSageView } from "./PublicSageView";

async function PublicSagePage({
  params,
}: {
  params: Promise<{
    sageToken: string;
  }>;
}) {
  const sageToken = (await params).sageToken;
  const session = await getServerSession(authOptions);

  // Get sage with memory document and user info
  const sageData = await prisma.sage.findUnique({
    where: { token: sageToken },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      memoryDocuments: {
        orderBy: { version: "desc" },
        take: 1,
        select: { content: true },
      },
    },
  });

  if (!sageData) {
    notFound();
  }

  const sage = {
    ...sageData,
    expertise: sageData.expertise as string[],
    extra: sageData.extra as SageExtra,
    avatar: sageData.avatar as SageAvatar,
  };

  const memoryDocument = sageData.memoryDocuments[0]?.content ?? null;

  const isOwner = !!(session?.user && sage.userId === session.user.id);

  // Check if Memory Document is ready
  if (!memoryDocument) {
    notFound();
  }

  return <PublicSageView sage={sage} isOwner={isOwner} isAuthenticated={!!session?.user} />;
}

export default async function PublicSagePageWithLoading({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PublicSagePage params={params} />
    </Suspense>
  );
}
