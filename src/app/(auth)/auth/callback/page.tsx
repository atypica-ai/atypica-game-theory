import authOptions from "@/app/(auth)/authOptions";
import { UserExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

// // The main logic is in the component, but we wrap it in Suspense
// // as a best practice when dealing with searchParams in Server Components.
// export default function AuthCallbackPage({
//   searchParams,
// }: {
//   searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
// }) {
//   return (
//     <Suspense fallback={<PageLoadingFallback />}>
//       <AuthCallback searchParams={searchParams} />
//     </Suspense>
//   );
// }

// This is the core server component that handles the logic.
export default async function AuthCallback({
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
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
  });
  const extra = (user.extra as UserExtra) || {};
  const hasCompletedOnboarding = Boolean(extra.onboarding?.completedAt);

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
