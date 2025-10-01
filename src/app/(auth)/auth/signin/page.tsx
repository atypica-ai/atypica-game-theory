import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { Suspense } from "react";
import { SignInClient } from "./SignInClient";

export default function SignInPageWithLoading() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SignInClient />
    </Suspense>
  );
}
