import authOptions from "@/app/(auth)/authOptions";
import {
  fetchDiscussionDetail,
  fetchDiscussionsByPanelId,
  fetchInterviewsByPanelId,
  fetchPersonaPanelById,
  fetchProjectByToken,
} from "@/app/(panel)/(page)/persona/panels/actions";
import { Forbidden } from "@/components/Forbidden";
import { NotFound } from "@/components/NotFound";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProjectDetailClient, type ProjectDetailClientProps } from "./ProjectDetailClient";

export const dynamic = "force-dynamic";

async function ProjectPage({ panelId, userChatToken }: { panelId: number; userChatToken: string }) {
  const [projectResult, panelResult, discussionsResult, interviewsResult] = await Promise.all([
    fetchProjectByToken(panelId, userChatToken),
    fetchPersonaPanelById(panelId),
    fetchDiscussionsByPanelId(panelId),
    fetchInterviewsByPanelId(panelId),
  ]);

  if (!projectResult.success) {
    if (projectResult.code === "forbidden") return <Forbidden />;
    return <NotFound />;
  }

  if (!panelResult.success) {
    return <NotFound />;
  }

  // Fetch first discussion detail if available
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
      panelTitle={panelResult.data.title}
      project={projectResult.data}
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
  params: Promise<{ panelId: string; userChatToken: string }>;
}) {
  const { panelId, userChatToken } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/persona/panels/${panelId}/projects/${userChatToken}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <ProjectPage panelId={parseInt(panelId, 10)} userChatToken={userChatToken} />
    </Suspense>
  );
}
