import { generatePageMetadata } from "@/lib/metadata";
import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { SharedInterviewPageClient } from "./components/SharedInterviewPageClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const token = params.token;
  if (!token) {
    return {};
  }

  const session = await prisma.interviewSession.findUnique({
    where: { token, type: "shareable" },
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

export default async function SharedInterviewPage({ params }: { params: { token: string } }) {
  const { token } = params;
  if (!token) {
    notFound();
  }

  // Find the interview session
  const session = await prisma.interviewSession.findUnique({
    where: { token, type: "shareable" },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
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

  return <SharedInterviewPageClient session={session} />;
}
