import { Button } from "@/components/ui/button";
import UserTokensBalance from "@/components/UserTokensBalance";
import { authOptions } from "@/lib/auth";
import { generatePageMetadata } from "@/lib/metadata";
import { FolderPlusIcon } from "lucide-react";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchInterviewProjects } from "./actions";
import { InterviewProjectList } from "./InterviewProjectList";
import { PageLayout } from "./PageLayout";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "Create Interview Project",
  description: "Interview project to gather information and insights",
});

export default async function InterviewProjectListPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent("/interviewProject")}`);
  }

  const result = await fetchInterviewProjects();
  if (!result.success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-500">Error loading interview projects: {result.message}</div>
      </div>
    );
  }

  return (
    <PageLayout
      menus={
        <>
          <Button variant="ghost" asChild>
            <Link href="/interviewProject/create">
              <FolderPlusIcon className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
          <UserTokensBalance />
        </>
      }
    >
      <InterviewProjectList projects={result.data} />
    </PageLayout>
  );
}
