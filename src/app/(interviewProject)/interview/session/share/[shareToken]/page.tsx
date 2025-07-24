import authOptions from "@/app/(auth)/authOptions";
import { validateShareToken } from "@/app/(interviewProject)/actions";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ShareInterviewPage } from "./ShareInterviewPage";

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
    const returnUrl = encodeURIComponent(`/interview/session/share/${shareToken}`);
    redirect(`/auth/signin?callbackUrl=${returnUrl}`);
  }

  // Validate the share token
  const result = await validateShareToken(shareToken);

  if (!result.success) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="space-y-4 text-center">
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mx-auto" />
              <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mx-auto" />
              <div className="h-32 w-96 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mx-auto" />
            </div>
          </div>
        }
      >
        <ShareInterviewPage shareToken={shareToken} projectInfo={result.data} user={session.user} />
      </Suspense>
    </div>
  );
}
