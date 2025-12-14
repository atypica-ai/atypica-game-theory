import authOptions from "@/app/(auth)/authOptions";
import { cleanAuthCallbackUrl } from "@/app/(auth)/lib";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { OnboardingPageClient } from "./OnboardingPageClient";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl: string }>;
}) {
  const { callbackUrl } = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/auth/signin`);
  }
  return <OnboardingPageClient callbackUrl={cleanAuthCallbackUrl(callbackUrl)} />;
}
