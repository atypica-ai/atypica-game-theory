import { fetchAnalystInterviews } from "@/app/(legacy)/interview/actions";
import { checkTezignAuth } from "@/app/admin/utils";
import { throwServerActionError } from "@/lib/serverAction";
import { fetchAnalystById } from "../actions";
import { AnalystDetail } from "./AnalystDetail";

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

  return <AnalystDetail analyst={analyst} interviews={interviews} />;
}
