"use client";
import { AddTokensDialog } from "@/app/payment/components/AddTokensDialog";
import { SubscriptionDialog } from "@/app/payment/components/SubscriptionDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SubscriptionPlan, UserSubscription, UserSubscriptionExtra } from "@/prisma/client";
import { CheckIcon, GiftIcon, InfoIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useState } from "react";
import { createHelloUserChatAction } from "./actions";

export default function PricingPageClient({
  activeSubscription,
  // stripeSubscriptionId,
}: {
  activeSubscription:
    | (Omit<UserSubscription, "extra"> & {
        extra: UserSubscriptionExtra;
      })
    | null;
  stripeSubscriptionId: string | null;
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

      <div className="py-8 md:pt-12 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Free Plan */}
        <Card className="flex flex-col not-dark:border-muted/40">
          <CardHeader>
            <CardTitle className="text-2xl">{t("freeTitle")}</CardTitle>
            <CardDescription className="h-12">{t("freeSubtitle")}</CardDescription>
            <div className="mt-4 h-30">
              <div className="text-3xl font-bold">{t("freePrice")}</div>
              <div className="mt-1 flex items-center gap-1">
                {t("freeTokens")}
                <TokenUsageTooltip />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow space-y-4">
            {activeSubscription ? (
              <Button className="w-full mb-6" disabled>
                {t("getStarted")}
              </Button>
            ) : (
              <Button className="w-full mb-6" asChild>
                <Link href="/auth/signup">{t("getStarted")}</Link>
              </Button>
            )}
            <FeatureItem text={t("features.tokenPurchase.notAvailable")} />
            <FeatureItem text={t("features.socialPlatforms.single")} />
            <FeatureItem text={t("features.personas.limited")} />
            <FeatureItem text={t("features.analysisModel.standard")} />
          </CardContent>
        </Card>

        {/* Basic Plan */}
        <Card
          className={cn(
            "flex flex-col not-dark:border-muted/40",
            "hidden", // 在 account 页面 add tokens，只有会员可以
          )}
        >
          <CardHeader>
            <CardTitle className="text-2xl">{t("basicTitle")}</CardTitle>
            <CardDescription className="h-12">{t("basicSubtitle")}</CardDescription>
            <div className="mt-4 h-30">
              <div>
                <span className="text-3xl font-bold">{t("oneMillionTokensPrice")}</span>
                <span className="text-lg">/{t("oneMillionTokens")}</span>
              </div>
              <div
                className={cn(
                  "mt-1 flex items-center gap-1",
                  locale === "en-US" && "tracking-tighter",
                )}
              >
                {t("payAsYouGoTokens")}
                <TokenUsageTooltip />
              </div>
              <div className="mt-2 flex items-start text-sm">
                <GiftIcon className="size-4 text-primary mr-2 mt-0.5" />
                <span
                  className={cn("flex-1 font-semibold", locale === "en-US" && "tracking-tight")}
                >
                  {t("features.tokens.basicGift")}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow space-y-4">
            <Button
              className="w-full mb-6"
              onClick={() => setIsTokensDialogOpen(true)}
              disabled={!activeSubscription}
            >
              {t("chooseBasic")}
            </Button>
            <FeatureItem text={t("features.socialPlatforms.multiple")} />
            <FeatureItem text={t("features.personas.limited")} />
            <FeatureItem text={t("features.reports.followUp")} />
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="flex flex-col not-dark:border-muted/40">
          <CardHeader>
            <CardTitle className="text-2xl">{t("proTitle")}</CardTitle>
            <CardDescription className="h-12">{t("proSubtitle")}</CardDescription>
            <div className="mt-4 h-30">
              <div>
                <span className="text-3xl font-bold">{t("proPrice")}</span>
                <span className="text-lg">/{t("month")}</span>
              </div>
              <div className="mt-1">{t("proMonthlyTokens")}</div>
              <div className="mt-2 flex items-start text-sm">
                <GiftIcon className="size-4 text-primary mr-2 mt-0.5" />
                <span className="flex-1 font-semibold">{t("features.tokens.proGift")}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow space-y-4">
            {!activeSubscription ? (
              <Button
                className="w-full mb-6"
                onClick={() => setIsSubscriptionDialogOpen({ plan: SubscriptionPlan.pro })}
              >
                {t("upgradeToPro")}
              </Button>
            ) : activeSubscription.plan === SubscriptionPlan.pro ? (
              <Button className="w-full mb-6" onClick={() => setIsTokensDialogOpen(true)}>
                {t("purchaseAdditionalTokens")}
              </Button>
            ) : (
              <Button className="w-full mb-6" disabled>
                {t("upgradeToPro")}
              </Button>
            )}
            <FeatureItem text={t("features.tokenPurchase.available")} />
            <FeatureItem text={t("features.multiModal")} />
            <FeatureItem text={t("features.socialPlatforms.multiple")} />
            <FeatureItem text={t("features.personas.unlimited")} />
            <FeatureItem text={t("features.analysisModel.enhanced")} />
          </CardContent>
        </Card>

        {/* Max Plan */}
        {/* <Card className="flex flex-col relative border-primary/50 shadow-md">
          <div className="absolute -top-4 left-0 right-0 flex justify-center">
            <div className="bg-primary text-primary-foreground px-4 py-1 text-sm rounded-full font-medium">
              Popular
            </div>
          </div> */}
        <Card className="flex flex-col not-dark:border-muted/40">
          <CardHeader>
            <CardTitle className="text-2xl">{t("maxTitle")}</CardTitle>
            <CardDescription className="h-12">{t("maxSubtitle")}</CardDescription>
            <div className="mt-4 h-30">
              <div>
                <span className="text-3xl font-bold">{t("maxPrice")}</span>
                <span className="text-lg">/{t("month")}</span>
              </div>
              <div className="mt-1">{t("maxMonthlyTokens")}</div>
              <div className="mt-2 flex items-start text-sm">
                <GiftIcon className="size-4 text-primary mr-2 mt-0.5" />
                <span className="flex-1 font-semibold">{t("features.tokens.maxGift")}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow space-y-4">
            {!activeSubscription ? (
              <Button
                className="w-full mb-6"
                onClick={() => setIsSubscriptionDialogOpen({ plan: SubscriptionPlan.max })}
              >
                {t("upgradeToMax")}
              </Button>
            ) : activeSubscription.plan === SubscriptionPlan.max ? (
              <Button className="w-full mb-6" onClick={() => setIsTokensDialogOpen(true)}>
                {t("purchaseAdditionalTokens")}
              </Button>
            ) : (
              <Button className="w-full mb-6" disabled>
                {t("upgradeToMax")}
              </Button>
            )}
            <FeatureItem text={t("features.tokenPurchase.available")} />
            <FeatureItem text={t("features.multiModal")} />
            <FeatureItem text={t("features.socialPlatforms.multiple")} />
            <FeatureItem text={t("features.personas.curated")} />
            <FeatureItem text={t("features.analysisModel.superior")} />
            <FeatureItem text={t("features.reports.followUp")} />
          </CardContent>
        </Card>

        {/* Enterprise Plan */}
        <Card
          className={cn(
            "flex flex-col not-dark:border-muted/40",
            "hidden", // 暂时隐藏
          )}
        >
          <CardHeader>
            <CardTitle className="text-2xl">{t("enterpriseTitle")}</CardTitle>
            {/* <CardDescription>{t("enterpriseSubtitle")}</CardDescription> */}
          </CardHeader>
          <CardContent className="flex-grow space-y-4">
            <Button className="w-full mb-6" variant="outline" onClick={() => sayHelloToSales()}>
              {t("contactSales")}
            </Button>
            <h3 className="font-medium mb-3">{t("features.enterprise.AdvancedAnalysisTools")}:</h3>
            <FeatureItem text={t("features.multiModal")} />
            <FeatureItem text={t("features.analysisModel.superior")} />
            <FeatureItem text={t("features.customReports")} />
            <FeatureItem text={t("features.reports.followUp")} />
            <FeatureItem text={t("features.reports.deepDive")} />
            <h3 className="font-medium mb-3 mt-6">{t("features.enterprise.DataIntegration")}:</h3>
            <FeatureItem
              text={t("features.socialPlatforms.multiple")}
              className={cn(locale === "en-US" && "tracking-tighter")}
            />
            <FeatureItem text={t("features.enterpriseData")} />
            <FeatureItem text={t("features.customPersonas")} />
            <h3 className="font-medium mb-3 mt-6">
              {t("features.enterprise.SecurityAndCollaboration")}:
            </h3>
            <FeatureItem text={t("features.collaboration")} />
            <FeatureItem text={t("features.security")} />
          </CardContent>
        </Card>
      </div>

      <div className="max-w-7xl mx-auto bg-muted/50 rounded-lg p-4 flex items-center gap-3 border border-border/50">
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
      />
    </div>
  );
}

function TokenUsageTooltip() {
  const t = useTranslations("PricingPage");
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <InfoIcon className="size-3.5 text-muted-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-80 p-4">
          <p>{t("averageStudyToken")}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function FeatureItem({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("flex items-start text-sm", className)}>
      <CheckIcon className="size-4 text-primary mr-2 mt-0.5" />
      <span className="flex-1">{text}</span>
    </div>
  );
}
