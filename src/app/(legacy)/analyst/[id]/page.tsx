import { fetchAnalystInterviews } from "@/app/(legacy)/interview/actions";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { notFound, redirect } from "next/navigation";
import { fetchAnalystById } from "../actions";
import { AnalystDetail } from "./AnalystDetail";

export const dynamic = "force-dynamic";

export default async function AnalystPage({ params }: { params: Promise<{ id: string }> }) {
  const analystId = parseInt((await params).id);

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=/analyst/${analystId}`);
  }

  const analyst = await fetchAnalystById(analystId);
  if (!analyst) {
    notFound();
  }

  const interviews = await fetchAnalystInterviews(analystId);

  return <AnalystDetail analyst={analyst} interviews={interviews} />;
}
