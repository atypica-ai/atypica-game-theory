import authOptions from "@/app/(auth)/authOptions";
import { Forbidden } from "@/components/Forbidden";
import { NotFound } from "@/components/NotFound";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { fetchInterviewsByPanelId, fetchPersonaPanelById } from "../../actions";
import { InterviewsClient } from "./InterviewsClient";

export const dynamic = "force-dynamic";

async function InterviewsPage({ panelId }: { panelId: number }) {
  const [panelResult, interviewsResult] = await Promise.all([
    fetchPersonaPanelById(panelId),
    fetchInterviewsByPanelId(panelId),
  ]);

  if (!panelResult.success) {
    if (panelResult.code === "forbidden") return <Forbidden />;
    return <NotFound />;
  }

  return (
    <InterviewsClient
      panelId={panelId}
      panelTitle={panelResult.data.title}
      interviews={interviewsResult.success ? interviewsResult.data.interviews : []}
      totalPersonas={interviewsResult.success ? interviewsResult.data.totalPersonas : 0}
    />
  );
}

export default async function InterviewsPageWithLoading({
  params,
}: {
  params: Promise<{ panelId: string }>;
}) {
  const { panelId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/persona/panels/${panelId}/interviews`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <InterviewsPage panelId={parseInt(panelId, 10)} />
    </Suspense>
  );
}
