import authOptions from "@/app/(auth)/authOptions";
import { ShareInterviewPage } from "@/app/(interviewProject)/components/ShareInterviewPage";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { validateShareToken } from "../../../actions";

interface SharePageProps {
  params: {
    token: string;
  };
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const result = await validateShareToken(params.token);

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
  const session = await getServerSession(authOptions);

  // Redirect to login if not authenticated
  if (!session?.user) {
    const returnUrl = encodeURIComponent(`/projects/share/${params.token}`);
    redirect(`/auth/signin?callbackUrl=${returnUrl}`);
  }

  // Validate the share token
  const result = await validateShareToken(params.token);

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
        <ShareInterviewPage
          shareToken={params.token}
          projectInfo={result.data}
          user={session.user}
        />
      </Suspense>
    </div>
  );
}
