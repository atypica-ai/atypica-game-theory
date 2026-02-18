import authOptions from "@/app/(auth)/authOptions";
import { Forbidden } from "@/components/Forbidden";
import { NotFound } from "@/components/NotFound";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  fetchDiscussionDetail,
  fetchDiscussionsByPanelId,
  fetchInterviewsByPanelId,
  fetchProjectContextByToken,
} from "./actions";
import { ProjectDetailClient, type ProjectDetailClientProps } from "./ProjectDetailClient";

export const dynamic = "force-dynamic";

async function ProjectPage({ userChatToken }: { userChatToken: string }) {
  const projectContextResult = await fetchProjectContextByToken(userChatToken);

  if (!projectContextResult.success) {
    if (projectContextResult.code === "forbidden") return <Forbidden />;
    return <NotFound />;
  }

  const { panelId, panelTitle, project } = projectContextResult.data;

  const [discussionsResult, interviewsResult] = await Promise.all([
    fetchDiscussionsByPanelId(panelId),
    fetchInterviewsByPanelId(panelId),
  ]);

  let discussionDetail: ProjectDetailClientProps["discussionDetail"] = null;

  if (discussionsResult.success && discussionsResult.data.length > 0) {
    const firstDiscussion = discussionsResult.data[0];
    const detailResult = await fetchDiscussionDetail(panelId, firstDiscussion.token);
    if (detailResult.success) {
      discussionDetail = detailResult.data;
    }
  }

  return (
    <ProjectDetailClient
      panelId={panelId}
      panelTitle={panelTitle}
      project={project}
      discussions={discussionsResult.success ? discussionsResult.data : []}
      discussionDetail={discussionDetail}
      interviews={interviewsResult.success ? interviewsResult.data.interviews : []}
      totalPersonas={interviewsResult.success ? interviewsResult.data.totalPersonas : 0}
    />
  );
}

export default async function ProjectPageWithLoading({
  params,
}: {
  params: Promise<{ userChatToken: string }>;
}) {
  const { userChatToken } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/panel/project/${userChatToken}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <ProjectPage userChatToken={userChatToken} />
    </Suspense>
  );
}
