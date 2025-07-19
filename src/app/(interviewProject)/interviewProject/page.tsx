import authOptions from "@/app/(auth)/authOptions";
import { Button } from "@/components/ui/button";
import UserTokensBalance from "@/components/UserTokensBalance";
import { generatePageMetadata } from "@/lib/request/metadata";
import { FolderPlusIcon } from "lucide-react";
import { getServerSession } from "next-auth/next";
import { useTranslations } from "next-intl";
import { getLocale } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchInterviewProjects } from "./actions";
import { InterviewProjectList } from "./InterviewProjectList";
import { PageLayout } from "./PageLayout";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  return generatePageMetadata({
    title: "Create Interview Project",
    description: "Interview project to gather information and insights",
    locale,
  });
}

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
          <NewProjectButton />
          <UserTokensBalance />
        </>
      }
    >
      <InterviewProjectList projects={result.data} />
    </PageLayout>
  );
}

function NewProjectButton() {
  const t = useTranslations("InterviewProject");
  return (
    <Button variant="ghost" asChild>
      <Link href="/interviewProject/create">
        <FolderPlusIcon className="mr-2 h-4 w-4" />
        {t("newProject")}
      </Link>
    </Button>
  );
}
