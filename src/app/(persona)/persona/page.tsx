import authOptions from "@/app/(auth)/authOptions";
import { fetchActiveSubscription } from "@/app/account/lib";
import { checkTezignAuth } from "@/app/admin/actions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { getServerSession } from "next-auth";
import { Suspense } from "react";
import PersonaHomePageClient from "./PersonaHomePageClient";

async function PersonaHomePage() {
  // Check if user is superadmin to enable upload feature
  let isUploadEnabled = false;
  try {
    await checkTezignAuth();
    isUploadEnabled = true;
  } catch {
    // User is not superadmin, upload remains disabled
    isUploadEnabled = false;
    const session = await getServerSession(authOptions);
    if (session?.user) {
      const result = await fetchActiveSubscription({
        userId: session?.user?.id,
      });
      if (result.activeSubscription?.plan === "max" || result.activeSubscription?.plan === "team") {
        isUploadEnabled = true;
      }
    }
  }

  return <PersonaHomePageClient isUploadEnabled={isUploadEnabled} />;
}

export default async function PersonaHomePageWithLoading() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PersonaHomePage />
    </Suspense>
  );
}
