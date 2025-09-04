import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { InterviewProjectExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ProjectDetails } from "./ProjectDetails";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectToken: string }>;
}): Promise<Metadata> {
  const { projectToken } = await params;
  return {
    title: `Interview Project #${projectToken}`,
  };
}

async function ProjectPage({ params }: { params: Promise<{ projectToken: string }> }) {
  const { projectToken } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/interview/projects/${projectToken}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

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
    />
  );
}

export default async function ProjectPageWithLoading({
  params,
}: {
  params: Promise<{ projectToken: string }>;
}) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <ProjectPage params={params} />
    </Suspense>
  );
}
