import { authOptions } from "@/lib/auth";
import { generatePageMetadata } from "@/lib/metadata";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { InterviewExpertDashboard } from "./InterviewExpertDashboard";
import { fetchInterviewExpertProjects } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "Interview Expert",
  description: "Interview expert to gather information and insights",
});

export default async function InterviewExpertPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent("/interviewExpert")}`);
  }

  const result = await fetchInterviewExpertProjects();
  if (!result.success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-500">Error loading interview projects: {result.message}</div>
      </div>
    );
  }

  return <InterviewExpertDashboard projects={result.data} />;
}