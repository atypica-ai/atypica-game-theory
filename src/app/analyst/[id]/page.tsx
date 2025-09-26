import { reportHTMLSystem } from "@/ai/prompt";
import { podcastScriptSystem } from "@/app/(podcast)/prompt";
import { fetchAnalystInterviews } from "@/app/(agents)/interview/actions";
import { checkTezignAuth } from "@/app/admin/actions";
import { throwServerActionError } from "@/lib/serverAction";
import { AnalystKind } from "@/prisma/types";
import { getLocale } from "next-intl/server";
import { fetchAnalystById } from "../actions";
import { AnalystDetail } from "./AnalystDetail";
import { fetchAnalystReports } from "./actions";
import { fetchAnalystPodcasts } from "@/app/(podcast)/actions";

export const dynamic = "force-dynamic";

export default async function AnalystPage({ params }: { params: Promise<{ id: string }> }) {
  await checkTezignAuth();

  const analystId = parseInt((await params).id);
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

  const defaultPodcastSystem = podcastScriptSystem({
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
      defaultPodcastSystem={defaultPodcastSystem}
    />
  );
}
