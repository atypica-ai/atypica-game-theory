import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProjectDetails } from "../ProjectDetails";

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

async function ProjectSharePage({ params }: { params: Promise<{ projectToken: string }> }) {
  const { projectToken } = await params;

  const interviewProject = await prisma.interviewProject.findUnique({
    where: { token: projectToken },
    select: {
      id: true,
      token: true,
      brief: true,
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
