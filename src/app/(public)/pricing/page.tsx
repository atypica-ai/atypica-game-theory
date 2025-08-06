import authOptions from "@/app/(auth)/authOptions";
import { fetchActiveSubscription } from "@/app/account/lib";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import PricingPageClient from "./PricingPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PricingPage");
  return {
    title: `${t("title")}`,
    description: t("subtitle"),
  };
}

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    const userId = session.user.id;
    const { activeSubscription, stripeSubscriptionId, userType } = await fetchActiveSubscription({
      userId,
    });
    return (
      <PricingPageClient
        activeSubscription={activeSubscription}
        stripeSubscriptionId={stripeSubscriptionId}
        userType={userType}
      />
    );
  } else {
    return (
      <PricingPageClient
        activeSubscription={null}
        stripeSubscriptionId={null}
        userType="Personal"
      />
    );
  }
}
