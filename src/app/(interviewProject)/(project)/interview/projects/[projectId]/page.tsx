import authOptions from "@/app/(auth)/authOptions";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ProjectDetails } from "./ProjectDetails";

const paramsSchema = z.object({
  projectId: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) {
      throw new Error("Invalid project ID");
    }
    return num;
  }),
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;
  return {
    title: `Interview Project #${projectId}`,
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<z.input<typeof paramsSchema>>;
}) {
  const { projectId } = paramsSchema.parse(await params);

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/interview/projects/${projectId}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  const userId = session.user.id;

  const interviewProject = await prisma.interviewProject.findUnique({
    where: { userId, id: projectId },
    select: {
      id: true,
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
        brief: interviewProject.brief,
        createdAt: interviewProject.createdAt,
      }}
    />
  );
}
