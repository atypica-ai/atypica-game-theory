import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Subscription, SubscriptionPlan, UserType } from "@/prisma/client";
import { CheckIcon, CoinsIcon, GiftIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface MaxPlanCardProps {
  productPrices: any;
  activeSubscription: Subscription | null;
  userType: UserType;
  onUpgrade: () => void;
  onPurchaseTokens: () => void;
}

export function MaxPlanCard({
  productPrices,
  activeSubscription,
  userType,
  onUpgrade,
  onPurchaseTokens,
}: MaxPlanCardProps) {
  const locale = useLocale();
  const t = useTranslations("PricingPage");

  return (
    <Card className="flex flex-col not-dark:border-muted/40">
      <CardHeader>
        <CardTitle className="text-2xl">{t("maxTitle")}</CardTitle>
        <CardDescription className="h-12">{t("maxSubtitle")}</CardDescription>
        <div className="mt-4 h-30">
          <div>
            <span className="text-3xl font-bold">
              {locale === "zh-CN"
                ? `¥${productPrices["MAX1MONTH"]["CNY"]}`
                : `$${productPrices["MAX1MONTH"]["USD"]}`}
            </span>
            <span className="text-lg">/{t("month")}</span>
          </div>
          <div className="mt-1 flex items-center">
            <CoinsIcon className="size-4 mr-2" />
            <span>{t("maxMonthlyTokens")}</span>
          </div>
          <div className="mt-2 flex items-start text-sm">
            <GiftIcon className="size-4 text-primary mr-2 mt-0.5" />
            <span className="flex-1 font-semibold">{t("features.tokens.maxGift")}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        {userType !== "Personal" ? (
          <Button className="w-full mb-6 text-xs" disabled>
            {t("switchToPersonalUserToContinue")}
          </Button>
        ) : !activeSubscription || activeSubscription.plan === SubscriptionPlan.pro ? (
          <Button className="w-full mb-6" onClick={onUpgrade}>
            {t("upgradeToMax")}
          </Button>
        ) : activeSubscription.plan === SubscriptionPlan.max ? (
          <Button className="w-full mb-6" onClick={onPurchaseTokens}>
            {t("purchaseAdditionalTokens")}
          </Button>
        ) : (
          <Button className="w-full mb-6" disabled>
            {t("upgradeToMax")}
          </Button>
        )}
        <div className="text-sm text-muted-foreground bg-muted/50 rounded p-3 mb-2">
          {t("features.tokenPurchase.available")}
        </div>
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
