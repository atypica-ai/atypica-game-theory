"use client";
import { TProductPrices } from "@/app/payment/actions";
import { AddTokensDialog } from "@/app/payment/components/AddTokensDialog";
import { SubscriptionDialog } from "@/app/payment/components/SubscriptionDialog";
import { TeamSubscriptionDialog } from "@/app/payment/components/TeamSubscriptionDialog";
import { LoadingPulse } from "@/components/LoadingPulse";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trackEvent } from "@/lib/analytics/segment";
import { Subscription, SubscriptionPlan, Team, UserType } from "@/prisma/client";
import { InfoIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { EnterprisePlanCard } from "./EnterprisePlanCard";
import { FreePlanCard } from "./FreePlanCard";
import { MaxPlanCard } from "./MaxPlanCard";
import { ProPlanCard } from "./ProPlanCard";
import { SuperPlanCard } from "./SuperPlanCard";
import { SuperTeamPlanCard } from "./SuperTeamPlanCard";
import { TeamPlanCard } from "./TeamPlanCard";
import { createHelloUserChatAction } from "./actions";

type TPricingTab = "organization" | "individual" | "unlimited";

export default function PricingPageClient({
  productPrices,
  activeSubscription,
  userType,
  team,
}: {
  productPrices: TProductPrices;
  activeSubscription: Subscription | null;
  stripeSubscriptionId: string | null;
  userType: UserType;
  team: Pick<Team, "id" | "name" | "seats"> | null;
}) {
  const locale = useLocale();
  const t = useTranslations("PricingPage");
  const [isTokensDialogOpen, setIsTokensDialogOpen] = useState(false);
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState<{
    plan: SubscriptionPlan;
  } | null>(null);
  const [isTeamSubscriptionDialogOpen, setIsTeamSubscriptionDialogOpen] = useState<{
    plan: SubscriptionPlan;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<TPricingTab | null>(null);

  // Read hash on mount
  useEffect(() => {
    let tab: TPricingTab;
    const hash = window.location.hash.slice(1);
    if (hash === "organization" || hash === "individual" || hash === "unlimited") {
      tab = hash;
    } else {
      tab = "individual";
    }
    setActiveTab(tab);
    trackEvent("Product List Viewed", { category: tab });
  }, []);

  // Update hash when tab changes
  const handleTabChange = (value: TPricingTab) => {
    setActiveTab(value);
    window.history.pushState(null, "", `#${value}`);
    trackEvent("Product List Viewed", { category: value });
  };

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

  return activeTab ? (
    <div className="px-4 py-16">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">{t("title")}</h1>
        <p className="text-xl text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(tab) => handleTabChange(tab as TPricingTab)}
        className="max-w-6xl mx-auto"
      >
        <TabsList className="mx-auto mb-8 h-12 w-full max-w-2xl">
          <TabsTrigger
            value={"individual" as TPricingTab}
            className="flex-none w-[30%] cursor-pointer px-0"
          >
            <span className="truncate">{t("tabs.individual")}</span>
          </TabsTrigger>
          <TabsTrigger
            value={"organization" as TPricingTab}
            className="flex-1 cursor-pointer px-0 tracking-tighter"
          >
            <span className="truncate">{t("tabs.teamEnterprise")}</span>
          </TabsTrigger>
          <TabsTrigger
            value={"unlimited" as TPricingTab}
            className="flex-none w-[30%] cursor-pointer px-0"
          >
            <span className="truncate">{t("tabs.unlimited")}</span>
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

        <TabsContent value="unlimited">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <SuperPlanCard
              productPrices={productPrices}
              activeSubscription={activeSubscription}
              userType={userType}
              onUpgrade={() => setIsSubscriptionDialogOpen({ plan: SubscriptionPlan.super })}
            />
            <SuperTeamPlanCard
              productPrices={productPrices}
              userType={userType}
              activeSubscription={activeSubscription}
              onPurchase={
                team
                  ? () => setIsTeamSubscriptionDialogOpen({ plan: SubscriptionPlan.superteam })
                  : undefined
              }
            />
          </div>
        </TabsContent>

        <TabsContent value="organization">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <TeamPlanCard
              productPrices={productPrices}
              userType={userType}
              activeSubscription={activeSubscription}
              onPurchase={
                team
                  ? () => setIsTeamSubscriptionDialogOpen({ plan: SubscriptionPlan.team })
                  : undefined
              }
            />
            <EnterprisePlanCard onContactSales={sayHelloToSales} />
          </div>
        </TabsContent>
      </Tabs>

      <div className="max-w-6xl mx-auto mt-8 bg-muted/50 rounded-lg p-4 flex items-center gap-3 border border-border/50">
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
      {team && isTeamSubscriptionDialogOpen && (
        <TeamSubscriptionDialog
          plan={isTeamSubscriptionDialogOpen.plan}
          open={true}
          onOpenChange={(open) => {
            if (!open) setIsTeamSubscriptionDialogOpen(null);
          }}
          team={team}
        />
      )}
    </div>
  ) : (
    <div className="flex items-center justify-center p-20">
      <LoadingPulse />
    </div>
  );
}
