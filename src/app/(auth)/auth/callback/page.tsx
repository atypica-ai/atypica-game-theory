import authOptions from "@/app/(auth)/authOptions";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { checkOnboardingStatus } from "../onboarding/actions";

// The main logic is in the component, but we wrap it in Suspense
// as a best practice when dealing with searchParams in Server Components.
export default function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense fallback={<CallbackLoading />}>
      <AuthCallback searchParams={searchParams} />
    </Suspense>
  );
}

// This is the core server component that handles the logic.
async function AuthCallback({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  let { callbackUrl } = await searchParams;
  callbackUrl = typeof callbackUrl === "string" ? callbackUrl : "/";

  // 1. Get the server session
  const session = await getServerSession(authOptions);

  // 2. Check for a valid session and user ID
  if (!session?.user?.id) {
    // If no session, redirect back to sign-in, preserving the original callbackUrl
    return redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // 3. Check onboarding status from the server
  const hasCompletedOnboarding = await checkOnboardingStatus(session.user.id);

  // 4. Redirect based on onboarding status
  if (!hasCompletedOnboarding) {
    // If onboarding is not complete, redirect to the onboarding page,
    // preserving the final callbackUrl.
    return redirect(`/auth/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  } else {
    // If onboarding is complete, redirect to the final destination.
    return redirect(callbackUrl);
  }
}

// A simple loading component to show while the server logic is processing.
// This will be visible for a very short time, if at all.
function CallbackLoading() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current mx-auto"></div>
        <div className="text-sm text-muted-foreground">Finalizing your login...</div>
      </div>
    </div>
  );
}
