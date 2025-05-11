import { fetchInterviewProjectByToken } from "@/app/interviewProject/actions";
import UserTokensBalance from "@/components/UserTokensBalance";
import { authOptions } from "@/lib/auth";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { forbidden, notFound, redirect } from "next/navigation";
import { BackToProjectsButton } from "../components/BackButtons";
import { PageLayout } from "../PageLayout";
import { InterviewProjectDetail } from "./InterviewProjectDetail";

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

  const result = await fetchInterviewProjectByToken(token);
  if (!result.success || !result.data.title) {
    return {};
  }
  const interviewProject = result.data;

  return generatePageMetadata({
    title: interviewProject.title,
    description: interviewProject.brief || undefined,
  });
}

export default async function InterviewProjectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/interviewProject/${token}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const result = await fetchInterviewProjectByToken(token);
  if (!result.success) {
    notFound();
  }

  const project = result.data;
  if (project.userId !== session.user.id) {
    forbidden();
  }

  return (
    <PageLayout
      menus={
        <>
          <BackToProjectsButton />
          <UserTokensBalance />
        </>
      }
    >
      <InterviewProjectDetail project={project} />
    </PageLayout>
  );
}
