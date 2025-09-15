import authOptions from "@/app/(auth)/authOptions";
import { fetchActiveSubscription } from "@/app/account/lib";
import { fetchProductPricesAction } from "@/app/payment/actions";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import PricingPageClient from "./PricingPageClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PricingPage");
  const locale = await getLocale();
  return generatePageMetadata({
    title: `${t("title")}`,
    description: t("subtitle"),
    locale,
  });
}

export default async function PricingPage() {
  const productPrices = await fetchProductPricesAction();
  const session = await getServerSession(authOptions);
  if (session?.user) {
    const userId = session.user.id;
    const { activeSubscription, stripeSubscriptionId, userType } = await fetchActiveSubscription({
      userId,
    });
    return (
      <PricingPageClient
        productPrices={productPrices}
        activeSubscription={activeSubscription}
        stripeSubscriptionId={stripeSubscriptionId}
        userType={userType}
      />
    );
  } else {
    return (
      <PricingPageClient
        productPrices={productPrices}
        activeSubscription={null}
        stripeSubscriptionId={null}
        userType="Personal"
      />
    );
  }
}
