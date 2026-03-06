import { TUniversalMessageWithTool } from "@/app/(universal)/tools/types";
import { fetchUniversalUserChatByToken } from "@/app/(universal)/universal/actions";
import authOptions from "@/app/(auth)/authOptions";
import { Forbidden } from "@/components/Forbidden";
import { NotFound } from "@/components/NotFound";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { fetchProjectContextByToken } from "./actions";
import { ProjectDetailClient } from "./ProjectDetailClient";

export const dynamic = "force-dynamic";

async function ProjectPage({ userChatToken }: { userChatToken: string }) {
  const [projectContextResult, chatResult] = await Promise.all([
    fetchProjectContextByToken(userChatToken),
    fetchUniversalUserChatByToken(userChatToken),
  ]);

  if (!projectContextResult.success) {
    if (projectContextResult.code === "forbidden") return <Forbidden />;
    return <NotFound />;
  }

  if (!chatResult.success) {
    return <NotFound />;
  }

  const { panelId, panelTitle, project } = projectContextResult.data;

  return (
    <ProjectDetailClient
      panelId={panelId}
      panelTitle={panelTitle}
      project={project}
      initialMessages={chatResult.data.messages as TUniversalMessageWithTool[]}
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
