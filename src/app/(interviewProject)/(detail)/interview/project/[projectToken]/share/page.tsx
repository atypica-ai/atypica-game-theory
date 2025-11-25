import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { truncateForTitle } from "@/lib/textUtils";
import { InterviewProjectExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectDetails } from "../ProjectDetails";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectToken: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const { projectToken } = await params;
  const interviewProject = await prisma.interviewProject.findUnique({
    where: { token: projectToken },
    select: {
      brief: true,
    },
  });
  if (!interviewProject) {
    return {};
  }
  const title = truncateForTitle(interviewProject.brief, {
    maxDisplayWidth: 60,
    suffix: "",
  });
  return generatePageMetadata({ title, locale });
}

async function ProjectSharePage({ params }: { params: Promise<{ projectToken: string }> }) {
  const { projectToken } = await params;

  const interviewProject = await prisma.interviewProject.findUnique({
    where: { token: projectToken },
    select: {
      id: true,
      token: true,
      brief: true,
      extra: true,
      createdAt: true,
    },
  });

  if (!interviewProject) {
    notFound();
  }

  return (
    <ProjectDetails
      project={{
        id: interviewProject.id,
        token: interviewProject.token,
        brief: interviewProject.brief,
        extra: interviewProject.extra as InterviewProjectExtra,
        createdAt: interviewProject.createdAt,
      }}
      readOnly={true}
    />
  );
}

export default async function ProjectSharePageWithLoading({
  params,
}: {
  params: Promise<{ projectToken: string }>;
}) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <ProjectSharePage params={params} />
    </Suspense>
  );
}
