import authOptions from "@/app/(auth)/authOptions";
import { validateInterviewShareToken } from "@/app/(interviewProject)/lib";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { InviteInterviewClient } from "./InviteInterviewClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("InterviewProject.shareInvite");
  return {
    title: t("title"),
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{
    shareToken: string;
  }>;
}) {
  const { shareToken } = await params;
  const session = await getServerSession(authOptions);
  // Validate the share token
  const projectInfo = await validateInterviewShareToken(shareToken);
  if (!projectInfo) {
    notFound();
  }
  return (
    <InviteInterviewClient
      shareToken={shareToken}
      projectInfo={projectInfo}
      user={session?.user || null}
    />
  );
}
