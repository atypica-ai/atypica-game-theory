import { cleanAuthCallbackUrl } from "@/app/(auth)/lib";
import { SignUpPageClient } from "./SignUpPageClient";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  return <SignUpPageClient callbackUrl={cleanAuthCallbackUrl(callbackUrl || "/")} />;
}
