import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import PersonaHomePageClient from "./PersonaHomePageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PersonaImport.homepage");
  return { title: t("title") };
}

async function PersonaHomePage() {
  // Check if user is superadmin to enable upload feature
  // let isUploadEnabled = false;
  // try {
  //   await checkTezignAuth();
  //   isUploadEnabled = true;
  // } catch {
  //   // User is not superadmin, upload remains disabled
  //   isUploadEnabled = false;
  //   const session = await getServerSession(authOptions);
  //   if (session?.user) {
  //     const result = await fetchActiveSubscription({
  //       userId: session?.user?.id,
  //     });
  //     if (result.activeSubscription?.plan === "max" || result.activeSubscription?.plan === "team") {
  //       isUploadEnabled = true;
  //     }
  //   }
  // }
  // 全面开放 personaImport
  return <PersonaHomePageClient isUploadEnabled={true} />;
}

export default async function PersonaHomePageWithLoading() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PersonaHomePage />
    </Suspense>
  );
}
