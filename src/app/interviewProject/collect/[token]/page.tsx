import { generatePageMetadata } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";
import { InterviewSessionKind } from "@prisma/client";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectSessionClient } from "./CollectSessionClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  if (!token) {
    return {};
  }

  const session = await prisma.interviewSession.findUnique({
    where: { token, kind: InterviewSessionKind.collect },
    include: {
      project: true,
    },
  });

  if (!session) {
    return {};
  }

  return generatePageMetadata({
    title: `${session.title} - Interview`,
    description: session.description || `Share your insights for ${session.project.title}`,
  });
}

export default async function CollectSessionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) {
    notFound();
  }

  // Find the interview session
  const session = await prisma.interviewSession.findUnique({
    where: { token, kind: InterviewSessionKind.collect },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          objectives: true,
        },
      },
    },
  });

  if (!session) {
    notFound();
  }

  // Check if session is expired
  if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">This interview has expired</h1>
          <p className="text-muted-foreground">
            The link to this interview is no longer active. Please contact the interview organizer
            if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  return <CollectSessionClient session={session} />;
}
