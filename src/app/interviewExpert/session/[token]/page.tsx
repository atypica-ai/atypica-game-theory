import { fetchInterviewSession } from "@/app/interviewExpert/actions";
import { authOptions } from "@/lib/auth";
import { generatePageMetadata } from "@/lib/metadata";
import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { forbidden, notFound, redirect } from "next/navigation";
import { SessionPage } from "./components/SessionPage";

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

  const result = await fetchInterviewSession(token);
  if (!result.success || !result.data.title) {
    return {};
  }

  return generatePageMetadata({
    title: `${result.data.title} - Interview Expert`,
    description: result.data.project.description || "Interview expert session",
  });
}

export default async function InterviewSessionPage({ params }: { params: { token: string } }) {
  const { token } = params;
  if (!token) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/interviewExpert/session/${token}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const result = await fetchInterviewSession(token);
  if (!result.success) {
    notFound();
  }

  const interviewSession = result.data;
  if (interviewSession.project.userId !== session.user.id) {
    forbidden();
  }

  return <SessionPage sessionData={interviewSession} />;
}
