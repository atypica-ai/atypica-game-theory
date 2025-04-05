import { fetchAnalystById } from "@/app/analyst/actions";
import { fetchAnalystInterviewById } from "@/app/interview/actions";
import { fetchPersonaById } from "@/app/personas/actions";
import { authOptions } from "@/lib/auth";
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

  const analystInterview = await fetchAnalystInterviewById(id);
  const persona = await fetchPersonaById(analystInterview.personaId);
  const analyst = await fetchAnalystById(analystInterview.analystId);

  return (
    <InterviewBackground analystInterview={analystInterview} analyst={analyst} persona={persona} />
  );
}
