import { fetchAnalystById } from "@/app/(legacy)/analyst/actions";
import { fetchAnalystInterviewById } from "@/app/(legacy)/interview/actions";
import { fetchPersonaById } from "@/app/(legacy)/personas/actions";
import { authOptions } from "@/lib/auth";
import { throwServerActionError } from "@/lib/serverAction";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { InterviewBackground } from "./InterviewBackground";

export const dynamic = "force-dynamic";

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const id = parseInt((await params).id);

  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(`/auth/signin?callbackUrl=/interview/${id}`);
  }

  const analystInterviewResult = await fetchAnalystInterviewById(id);
  if (!analystInterviewResult.success) {
    throwServerActionError(analystInterviewResult);
  }
  const analystInterview = analystInterviewResult.data;

  const personaResult = await fetchPersonaById(analystInterview.personaId);
  if (!personaResult.success) {
    throwServerActionError(personaResult);
  }
  const analystResult = await fetchAnalystById(analystInterview.analystId);
  if (!analystResult.success) {
    throwServerActionError(analystResult);
  }

  return (
    <InterviewBackground
      analystInterview={analystInterview}
      analyst={analystResult.data}
      persona={personaResult.data}
    />
  );
}
