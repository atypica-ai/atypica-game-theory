import { checkTezignAuth } from "@/app/admin/actions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { Suspense } from "react";
import { DeepResearchForm } from "./DeepResearchForm";

async function DeepResearchPage() {
  await checkTezignAuth();
  return <DeepResearchForm />;
}

export default async function DeepResearchPageWithLoading() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <DeepResearchPage />
    </Suspense>
  );
}
