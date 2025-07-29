import authOptions from "@/app/(auth)/authOptions";
import { validateShareToken } from "@/app/(interviewProject)/actions";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { InviteInterviewClient } from "./InviteInterviewClient";

interface SharePageProps {
  params: Promise<{
    shareToken: string;
  }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Join Interview",
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { shareToken } = await params;
  const session = await getServerSession(authOptions);

  // Validate the share token
  const result = await validateShareToken(shareToken);

  if (!result.success) {
    notFound();
  }

  return (
    <InviteInterviewClient
      shareToken={shareToken}
      projectInfo={result.data}
      user={session?.user || null}
    />
  );
}
