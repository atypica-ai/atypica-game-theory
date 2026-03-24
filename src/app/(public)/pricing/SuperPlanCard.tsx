import { TProductPrices } from "@/app/payment/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Subscription, SubscriptionPlan, UserType } from "@/prisma/client";
import { CheckIcon, Infinity } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface SuperPlanCardProps {
  productPrices: TProductPrices;
  activeSubscription: Subscription | null;
  userType: UserType;
  onUpgrade: () => void;
}

export function SuperPlanCard({
  productPrices,
  activeSubscription,
  userType,
  onUpgrade,
}: SuperPlanCardProps) {
  const locale = useLocale();
  const t = useTranslations("PricingPage");

  return (
    <Card className="flex flex-col not-dark:border-primary/40 border-2 relative">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
          UNLIMITED
        </span>
      </div>
      <CardHeader>
        <CardTitle className="text-2xl">{t("superTitle")}</CardTitle>
        <CardDescription className="h-12">{t("superSubtitle")}</CardDescription>
        <div className="mt-4 h-30">
          <div>
            <span className="text-3xl font-bold">
              {locale === "zh-CN"
                ? `¥${productPrices["SUPER1MONTH"]["CNY"]}`
                : `$${productPrices["SUPER1MONTH"]["USD"]}`}
            </span>
            <span className="text-lg">/{t("month")}</span>
          </div>
          <div className="mt-1 flex items-center">
            <Infinity className="size-4 mr-2 text-primary" />
            <span className="font-semibold">{t("superMonthlyTokens")}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grow space-y-4">
        {userType !== "Personal" ? (
          <Button className="w-full mb-6 text-xs" disabled>
            {t("switchToPersonalUserToContinue")}
          </Button>
        ) : activeSubscription?.plan === SubscriptionPlan.super ? (
          <Button className="w-full mb-6" disabled variant="secondary">
            Current Plan
          </Button>
        ) : !activeSubscription ||
          activeSubscription.plan === SubscriptionPlan.pro ||
          activeSubscription.plan === SubscriptionPlan.max ? (
          <Button className="w-full mb-6" onClick={onUpgrade}>
            {t("upgradeToSuper")}
          </Button>
        ) : (
          <Button className="w-full mb-6" disabled>
            {t("upgradeToSuper")}
          </Button>
        )}
        <FeatureItem text={t("features.multiModal")} />
        <FeatureItem text={t("features.socialPlatforms.multiple")} />
        <FeatureItem text={t("features.personas.curated")} />
        <FeatureItem text={t("features.analysisModel.superior")} />
        <FeatureItem text={t("features.reports.followUp")} />
        <FeatureItem text={t("features.personaImport.full")} />
        <FeatureItem text={t("features.interviewProject.full")} />
        <FeatureItemWithPreview text={t("features.podcastPreview")} />
        <FeatureItemWithPreview text={t("features.productRnDPreview")} />
      </CardContent>
    </Card>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-start text-sm">
      <CheckIcon className="size-4 text-primary mr-2 mt-0.5" />
      <span className="flex-1">{text}</span>
    </div>
  );
}

function FeatureItemWithPreview({ text }: { text: string }) {
  const t = useTranslations("PricingPage.features");
  return (
    <div className="flex items-start text-sm">
      <div className="size-4 mr-2">✨</div>
      <div className="flex-1">
        <span className="align-middle inline-block text-xs mr-1 px-1 bg-muted rounded-sm">
          {t("earlyAccess")}
        </span>
        <span className="align-middle">{text}</span>
      </div>
    </div>
  );
}
