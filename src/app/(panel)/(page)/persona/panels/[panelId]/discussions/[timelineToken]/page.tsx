import authOptions from "@/app/(auth)/authOptions";
import { Forbidden } from "@/components/Forbidden";
import { NotFound } from "@/components/NotFound";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { fetchDiscussionDetail } from "../../../actions";
import { DiscussionDetailClient } from "./DiscussionDetailClient";

export const dynamic = "force-dynamic";

async function DiscussionDetailPage({
  panelId,
  timelineToken,
}: {
  panelId: number;
  timelineToken: string;
}) {
  const result = await fetchDiscussionDetail(panelId, timelineToken);

  if (!result.success) {
    if (result.code === "forbidden") return <Forbidden />;
    return <NotFound />;
  }

  return (
    <DiscussionDetailClient
      panelId={panelId}
      timeline={result.data.timeline}
      personas={result.data.personas}
    />
  );
}

export default async function DiscussionDetailPageWithLoading({
  params,
}: {
  params: Promise<{ panelId: string; timelineToken: string }>;
}) {
  const { panelId, timelineToken } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/persona/panels/${panelId}/discussions/${timelineToken}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <DiscussionDetailPage panelId={parseInt(panelId, 10)} timelineToken={timelineToken} />
    </Suspense>
  );
}
