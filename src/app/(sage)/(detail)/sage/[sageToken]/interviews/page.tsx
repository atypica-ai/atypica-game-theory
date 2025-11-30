import authOptions from "@/app/(auth)/authOptions";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { forbidden, notFound } from "next/navigation";
import { InterviewsTab } from "./InterviewsTab";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Sage.detail.metadata");
  const { sageToken } = await params;

  // Only need name for metadata
  const sage = await prisma.sage.findUnique({
    where: { token: sageToken },
    select: { name: true },
  });

  if (!sage) {
    return {};
  }

  return generatePageMetadata({
    title: `${sage.name} - ${t("interviewsTitle")}`,
    description: t("interviewsDescription"),
    locale,
  });
}

export default async function SageInterviewsPage({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}) {
  const token = (await params).sageToken;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    forbidden();
  }

  // Only need basic sage info for ownership check
  const sage = await prisma.sage.findUnique({
    where: { token },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!sage) {
    notFound();
  }

  // Check ownership
  if (sage.userId !== session.user.id) {
    forbidden();
  }

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

  return <InterviewsTab interviews={sageInterviews} />;
}
