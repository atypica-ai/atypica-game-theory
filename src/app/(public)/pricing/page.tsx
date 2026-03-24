import authOptions from "@/app/(auth)/authOptions";
import { fetchActiveSubscription, isAwsMarketplaceUser } from "@/app/account/lib";
import { fetchProductPricesAction } from "@/app/payment/actions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AwsMarketplacePricingView } from "./AwsMarketplacePricingView";
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
  const session = await getServerSession(authOptions);
  if (session?.user) {
    const userId = session.user.id;
    const isAws = await isAwsMarketplaceUser(userId);

    if (isAws) {
      return <AwsMarketplacePricingView />;
    }

    const [{ activeSubscription, stripeSubscriptionId, userType }, team] = await Promise.all([
      fetchActiveSubscription({ userId }),
      session.userType === "TeamMember" && session.team?.id
        ? prisma.team.findUnique({
            where: { id: session.team.id },
            select: { id: true, name: true, seats: true },
          })
        : Promise.resolve(null),
    ]);
    const productPrices = await fetchProductPricesAction();

    return (
      <PricingPageClient
        productPrices={productPrices}
        activeSubscription={activeSubscription}
        stripeSubscriptionId={stripeSubscriptionId}
        userType={userType}
        team={team}
      />
    );
  } else {
    const productPrices = await fetchProductPricesAction();
    return (
      <PricingPageClient
        productPrices={productPrices}
        activeSubscription={null}
        stripeSubscriptionId={null}
        userType="Personal"
        team={null}
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
