import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import type { Metadata } from "next";
import { getServerSession, Session } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { forbidden } from "next/navigation";
import { Suspense } from "react";
import { SageInterviewsPageClient } from "./SageInterviewsPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Sage.PageMetadata");
  return generatePageMetadata({
    title: t("interviewsTitle"),
    description: t("interviewsDescription"),
    locale,
  });
}

async function SageInterviewsPage({
  sageToken,
  sessionUser,
}: {
  sageToken: string;
  sessionUser: NonNullable<Session["user"]>;
}) {
  const sage = await prisma.sage.findUniqueOrThrow({
    where: { token: sageToken, userId: sessionUser.id },
    select: {
      id: true,
      userId: true,
    },
  });

  // Fetch all interviews associated with this sage
  const sageInterviews = await prisma.sageInterview.findMany({
    where: {
      sageId: sage.id,
    },
    include: {
      userChat: {
        include: {
          messages: {
            take: 1,
            orderBy: { id: "desc" },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return <SageInterviewsPageClient interviews={sageInterviews} />;
}

export default async function SageInterviewsPageWithLoading({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}) {
  const token = (await params).sageToken;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    forbidden(); // layout 里已经处理过了，这里其实不会出现
  }
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SageInterviewsPage sageToken={token} sessionUser={session.user} />
    </Suspense>
  );
}
