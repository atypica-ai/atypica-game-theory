import { fetchAnalystInterviews } from "@/app/(legacy)/interview/actions";
import { checkTezignAuth } from "@/app/admin/actions";
import { throwServerActionError } from "@/lib/serverAction";
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

  return <AnalystDetail analyst={analyst} interviews={interviews} reports={reports} />;
}
