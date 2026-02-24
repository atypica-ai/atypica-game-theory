import authOptions from "@/app/(auth)/authOptions";
import { Forbidden } from "@/components/Forbidden";
import { NotFound } from "@/components/NotFound";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import {
  fetchDiscussionDetail,
  fetchProjectContextByToken,
  fetchProjectProgress,
  fetchProjectResearchByToken,
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

  const researchResult = await fetchProjectResearchByToken(userChatToken);
  const progressResult = await fetchProjectProgress(userChatToken);

  let discussionDetail: ProjectDetailClientProps["discussionDetail"] = null;

  if (researchResult.success && researchResult.data.discussions.length > 0) {
    const firstDiscussion = researchResult.data.discussions[0];
    const detailResult = await fetchDiscussionDetail(firstDiscussion.token);
    if (detailResult.success) {
      discussionDetail = detailResult.data;
    }
  }

  return (
    <ProjectDetailClient
      panelId={panelId}
      panelTitle={panelTitle}
      project={project}
      discussions={researchResult.success ? researchResult.data.discussions : []}
      discussionDetail={discussionDetail}
      interviewBatches={researchResult.success ? researchResult.data.interviewBatches : []}
      totalPersonas={researchResult.success ? researchResult.data.totalPersonas : 0}
      initialProgress={progressResult.success ? progressResult.data : null}
      initialPendingConfirmPlan={
        researchResult.success ? researchResult.data.pendingConfirmPlan : null
      }
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
