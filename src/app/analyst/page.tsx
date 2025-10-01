import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { throwServerActionError } from "@/lib/serverAction";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AnalystsList } from "./AnalystsList";
import { fetchAnalysts } from "./actions";

export const dynamic = "force-dynamic";

async function AnalystsPage() {
  const analystsResult = await fetchAnalysts();
  if (!analystsResult.success) {
    throwServerActionError(analystsResult);
  }
  return <AnalystsList analysts={analystsResult.data} />;
}

export default async function AnalystsPageWithLoading() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/analyst");
  }
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <AnalystsPage />
    </Suspense>
  );
}
