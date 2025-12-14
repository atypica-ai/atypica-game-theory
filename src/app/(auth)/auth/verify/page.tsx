import { cleanAuthCallbackUrl } from "@/app/(auth)/lib";
import { VerifyPageClient } from "./VerifyPageClient";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; email?: string }>;
}) {
  const { callbackUrl, email } = await searchParams;
  return (
    <VerifyPageClient
      callbackUrl={cleanAuthCallbackUrl(callbackUrl || "/")}
      email={email || ""}
    />
  );
}
