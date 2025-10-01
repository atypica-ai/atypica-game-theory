import { checkTezignAuth } from "@/app/admin/actions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { Suspense } from "react";
import { ScoutChat } from "./ScoutChat";

async function ScoutPage() {
  await checkTezignAuth();
  return <ScoutChat />;
}

export default async function ScoutPageWithLoading() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <ScoutPage />
    </Suspense>
  );
}
