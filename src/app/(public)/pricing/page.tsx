import { fetchActiveUserSubscription } from "@/app/account/lib";
import { authOptions } from "@/lib/auth";
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
    const { activeSubscription, stripeSubscriptionId } = await fetchActiveUserSubscription({
      userId,
    });
    return (
      <PricingPageClient
        activeSubscription={activeSubscription}
        stripeSubscriptionId={stripeSubscriptionId}
      />
    );
  } else {
    return <PricingPageClient activeSubscription={null} stripeSubscriptionId={null} />;
  }
}
