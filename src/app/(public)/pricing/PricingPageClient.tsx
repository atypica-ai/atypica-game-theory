"use client";
import { TProductPrices } from "@/app/payment/actions";
import { AddTokensDialog } from "@/app/payment/components/AddTokensDialog";
import { SubscriptionDialog } from "@/app/payment/components/SubscriptionDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Subscription, SubscriptionPlan, UserType } from "@/prisma/client";
import { InfoIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { EnterprisePlanCard } from "./EnterprisePlanCard";
import { FreePlanCard } from "./FreePlanCard";
import { MaxPlanCard } from "./MaxPlanCard";
import { ProPlanCard } from "./ProPlanCard";
import { TeamPlanCard } from "./TeamPlanCard";
import { createHelloUserChatAction } from "./actions";

export default function PricingPageClient({
  productPrices,
  activeSubscription,
  userType,
}: {
  productPrices: TProductPrices;
  activeSubscription: Subscription | null;
  stripeSubscriptionId: string | null;
  userType: UserType;
}) {
  const locale = useLocale();
  const t = useTranslations("PricingPage");
  const [isTokensDialogOpen, setIsTokensDialogOpen] = useState(false);
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState<{
    plan: SubscriptionPlan;
  } | null>(null);

  const sayHelloToSales = useCallback(async () => {
    const result = await createHelloUserChatAction({
      role: "user",
      content:
        locale === "zh-CN"
          ? "我是企业用户，想了解一下企业版"
          : "I want to learn about the enterprise plan",
    });
    if (!result.success) {
      throw result;
    }
    const chat = result.data;
    window.location.href = `/agents/hello/${chat.id}`;
  }, [locale]);

  return (
    <div className="px-4 py-16">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">{t("title")}</h1>
        <p className="text-xl text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Tabs defaultValue="individual" className="max-w-7xl mx-auto">
        <TabsList className="mx-auto mb-8 h-12">
          <TabsTrigger value="individual" className="cursor-pointer px-8">
            {t("tabs.individual")}
          </TabsTrigger>
          <TabsTrigger value="team" className="cursor-pointer px-4 tracking-tighter">
            {t("tabs.teamEnterprise")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="individual">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FreePlanCard activeSubscription={activeSubscription} />
            <ProPlanCard
              productPrices={productPrices}
              activeSubscription={activeSubscription}
              userType={userType}
              onUpgrade={() => setIsSubscriptionDialogOpen({ plan: SubscriptionPlan.pro })}
              onPurchaseTokens={() => setIsTokensDialogOpen(true)}
            />
            <MaxPlanCard
              productPrices={productPrices}
              activeSubscription={activeSubscription}
              userType={userType}
              onUpgrade={() => setIsSubscriptionDialogOpen({ plan: SubscriptionPlan.max })}
              onPurchaseTokens={() => setIsTokensDialogOpen(true)}
            />
          </div>
        </TabsContent>

        <TabsContent value="team">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <TeamPlanCard productPrices={productPrices} userType={userType} />
            <EnterprisePlanCard onContactSales={sayHelloToSales} />
          </div>
        </TabsContent>
      </Tabs>

      <div className="max-w-7xl mx-auto mt-8 bg-muted/50 rounded-lg p-4 flex items-center gap-3 border border-border/50">
        <InfoIcon className="size-5 text-primary shrink-0" />
        <p className="text-sm text-foreground/80">{t("averageStudyToken")}</p>
      </div>

      <AddTokensDialog open={isTokensDialogOpen} onOpenChange={setIsTokensDialogOpen} />
      <SubscriptionDialog
        plan={isSubscriptionDialogOpen?.plan}
        open={isSubscriptionDialogOpen !== null}
        onOpenChange={(open) => {
          if (!open) setIsSubscriptionDialogOpen(null);
        }}
        activeSubscription={activeSubscription}
      />
    </div>
  );
}
