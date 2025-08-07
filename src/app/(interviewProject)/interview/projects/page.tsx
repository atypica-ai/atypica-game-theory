import authOptions from "@/app/(auth)/authOptions";
import { fetchActiveSubscription } from "@/app/account/lib";
import { checkTezignAuth } from "@/app/admin/actions";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { InterviewProjectsClient } from "./InterviewProjectsClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("InterviewProject.projectsList");
  return {
    title: t("title"),
  };
}

export default async function InterviewProjectsPage() {
  let isCreateEnabled = false;
  try {
    await checkTezignAuth();
    isCreateEnabled = true;
  } catch {
    // User is not superadmin, upload remains disabled
    isCreateEnabled = false;
    const session = await getServerSession(authOptions);
    if (session?.user) {
      const result = await fetchActiveSubscription({
        userId: session?.user?.id,
      });
      if (result.activeSubscription?.plan === "max" || result.activeSubscription?.plan === "team") {
        isCreateEnabled = true;
      }
    }
  }

  return <InterviewProjectsClient isCreateEnabled={isCreateEnabled} />;
}
