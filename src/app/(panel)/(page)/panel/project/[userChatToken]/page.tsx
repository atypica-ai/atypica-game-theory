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
  const projectContextResult = await fetchProjectContextByToken(userChatToken);

  if (!projectContextResult.success) {
    if (projectContextResult.code === "forbidden") return <Forbidden />;
    return <NotFound />;
  }

  const { panelId, panelTitle, project } = projectContextResult.data;

  return <ProjectDetailClient panelId={panelId} panelTitle={panelTitle} project={project} />;
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
