import { fetchAnalystInterviews } from "@/app/(legacy)/interview/actions";
import { authOptions } from "@/lib/auth";
import { throwServerActionError } from "@/lib/serverAction";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { fetchAnalystById } from "../actions";
import { AnalystDetail } from "./AnalystDetail";

export const dynamic = "force-dynamic";

export default async function AnalystPage({ params }: { params: Promise<{ id: string }> }) {
  const analystId = parseInt((await params).id);

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=/analyst/${analystId}`);
  }

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
