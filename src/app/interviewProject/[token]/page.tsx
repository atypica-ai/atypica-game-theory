import { fetchInterviewProjectByToken } from "@/app/interviewProject/actions";
import { Button } from "@/components/ui/button";
import UserTokensBalance from "@/components/UserTokensBalance";
import { authOptions } from "@/lib/auth";
import { generatePageMetadata } from "@/lib/metadata";
import { ArrowLeftIcon } from "lucide-react";
import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { forbidden, notFound, redirect } from "next/navigation";
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
          <Button variant="ghost" asChild>
            <Link href="/interviewProject">
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Back to Projects
            </Link>
          </Button>
          <UserTokensBalance />
        </>
      }
    >
      <InterviewProjectDetail project={project} />
    </PageLayout>
  );
}
