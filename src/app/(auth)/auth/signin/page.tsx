import { cleanAuthCallbackUrl } from "@/app/(auth)/lib";
import { SignInPageClient } from "./SignInPageClient";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  return <SignInPageClient callbackUrl={cleanAuthCallbackUrl(callbackUrl || "/")} />;
}
