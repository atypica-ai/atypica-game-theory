import authOptions from "@/app/(auth)/authOptions";
import { validateShareToken } from "@/app/(interviewProject)/actions";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { ShareInterviewClient } from "./ShareInterviewClient";

interface SharePageProps {
  params: Promise<{
    shareToken: string;
  }>;
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { shareToken } = await params;
  if (!shareToken) {
    return {};
  }
  const result = await validateShareToken(shareToken);

  if (!result.success) {
    return {
      title: "Invalid Interview Link",
      description: "This interview link is invalid or has expired.",
    };
  }

  return {
    title: "Join Interview",
    description: `Join an interview session: ${result.data.brief.slice(0, 160)}`,
  };
}

export default async function SharePage({ params }: SharePageProps) {
  const { shareToken } = await params;
  if (!shareToken) {
    notFound();
  }
  const session = await getServerSession(authOptions);

  // Redirect to login if not authenticated
  if (!session?.user) {
    const returnUrl = encodeURIComponent(`/interview/invite/${shareToken}`);
    redirect(`/auth/signin?callbackUrl=${returnUrl}`);
  }

  // Validate the share token
  const result = await validateShareToken(shareToken);

  if (!result.success) {
    notFound();
  }

  return (
    <ShareInterviewClient shareToken={shareToken} projectInfo={result.data} user={session.user} />
  );
}
