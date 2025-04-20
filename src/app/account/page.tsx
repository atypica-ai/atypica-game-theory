import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AccountPageClient } from "./AccountPageClient";
import { fetchUserSubscription, fetchUserTokens } from "./data";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/account");
  }

  const userTokens = await fetchUserTokens();
  const subscription = await fetchUserSubscription();

  return <AccountPageClient userTokens={userTokens} subscription={subscription} />;
}
