import { reportHTMLSystem } from "@/ai/prompt";
import { fetchAnalystInterviews } from "@/app/(agents)/interview/actions";
import { checkTezignAuth } from "@/app/admin/actions";
import { throwServerActionError } from "@/lib/serverAction";
import { AnalystKind } from "@/lib/userChat/data";
import { getLocale } from "next-intl/server";
import { fetchAnalystById } from "../actions";
import { AnalystDetail } from "./AnalystDetail";
import { fetchAnalystReports } from "./actions";

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
      defaultReportHTMLSystem={defaultReportHTMLSystem}
    />
  );
}
