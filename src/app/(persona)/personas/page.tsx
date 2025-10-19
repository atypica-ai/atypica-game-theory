import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PersonasListClient } from "./PersonasListClient";

export default async function PersonasPageWithLoading() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = "/personas";
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PersonasListClient />
    </Suspense>
  );
}
