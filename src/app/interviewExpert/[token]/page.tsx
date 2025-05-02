import { fetchInterviewExpertProjectByToken } from "@/app/interviewExpert/actions";
import { authOptions } from "@/lib/auth";
import { generatePageMetadata } from "@/lib/metadata";
import { getServerSession } from "next-auth/next";
import { Metadata } from "next";
import { forbidden, notFound, redirect } from "next/navigation";
import { ProjectPage } from "./components/ProjectPage";

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
  
  const result = await fetchInterviewExpertProjectByToken(token);
  if (!result.success || !result.data.title) {
    return {};
  }
  
  return generatePageMetadata({
    title: `${result.data.title} - Interview Expert`,
    description: result.data.description || "Interview expert project",
  });
}

export default async function InterviewProjectPage({ 
  params 
}: { 
  params: { token: string } 
}) {
  const { token } = params;
  if (!token) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/interviewExpert/${token}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const result = await fetchInterviewExpertProjectByToken(token);
  if (!result.success) {
    notFound();
  }
  
  const project = result.data;
  if (project.userId !== session.user.id) {
    forbidden();
  }

  return <ProjectPage project={project} />;
}