import authOptions from "@/app/(auth)/authOptions";
import { fetchActiveSubscription } from "@/app/account/lib";
import { fetchProductPricesAction } from "@/app/payment/actions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import PricingPageClient from "./PricingPageClient";

// PricingPage 需要 fetchProductPricesAction 访问一下数据库
// 哪怕是放在 Suspense 里，也会在 build 阶段被实例化
// 除非是有些页面进来需要登录，那种可以去掉 force-dynamic
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

async function PricingPage() {
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

export default async function PricingPageWithLoading() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PricingPage />
    </Suspense>
  );
}
