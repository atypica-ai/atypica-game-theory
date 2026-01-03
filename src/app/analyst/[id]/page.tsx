import { fetchAnalystInterviews } from "@/app/(agents)/interview/actions";
import { fetchAnalystPodcasts } from "@/app/(podcast)/actions";
import { reportHTMLSystem } from "@/app/(study)/tools/generateReport/prompt";
import { checkTezignAuth } from "@/app/admin/actions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { throwServerActionError } from "@/lib/serverAction";
import { AnalystKind } from "@/prisma/client";
import { getLocale } from "next-intl/server";
import { Suspense } from "react";
import { fetchAnalystById } from "../actions";
import { AnalystDetail } from "./AnalystDetail";
import { fetchAnalystReports } from "./actions";

// export const dynamic = "force-dynamic";

async function AnalystPage({ analystId }: { analystId: number }) {
  await checkTezignAuth();

  const analystResult = await fetchAnalystById(analystId);
  if (!analystResult.success) {
    throwServerActionError(analystResult);
  }
  const analyst = analystResult.data;

  const interviewsResult = await fetchAnalystInterviews(analystId);
  if (!interviewsResult.success) {
    throwServerActionError(interviewsResult);
  }
  const interviews = interviewsResult.data;

  const reportsResult = await fetchAnalystReports({ analystId: analyst.id });
  if (!reportsResult.success) {
    throwServerActionError(reportsResult);
  }
  const reports = reportsResult.data;

  const podcastsResult = await fetchAnalystPodcasts({ analystId: analyst.id });
  if (!podcastsResult.success) {
    throwServerActionError(podcastsResult);
  }
  const podcasts = podcastsResult.data;

  const locale = await getLocale();
  const defaultReportHTMLSystem = reportHTMLSystem({
    locale,
    analystKind: (analyst.kind as AnalystKind) || AnalystKind.misc,
  });

  return (
    <AnalystDetail
      analyst={analyst}
      interviews={interviews}
      reports={reports}
      podcasts={podcasts}
      defaultReportHTMLSystem={defaultReportHTMLSystem}
    />
  );
}

export default async function AnalystPageWithLoading({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const analystId = parseInt((await params).id);
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <AnalystPage analystId={analystId} />
    </Suspense>
  );
}
