import { TProductPrices } from "@/app/payment/actions";
import { TeamCreateButton } from "@/app/team/components/TeamCreateButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Subscription, UserType } from "@/prisma/client";
import { CheckIcon, CoinsIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface TeamPlanCardProps {
  productPrices: TProductPrices;
  userType: UserType;
  activeSubscription: Subscription | null;
  isAwsMarketplaceUser?: boolean;
  onPurchase?: () => void;
}

export function TeamPlanCard({
  productPrices,
  userType,
  activeSubscription,
  isAwsMarketplaceUser,
  onPurchase,
}: TeamPlanCardProps) {
  const locale = useLocale();
  const t = useTranslations("PricingPage");

  return (
    <Card className="flex flex-col not-dark:border-muted/40">
      <CardHeader>
        <CardTitle className="text-2xl">{t("teamTitle")}</CardTitle>
        <div className="h-12">
          <CardDescription className="h-6">{t("teamSubtitle")}</CardDescription>
        </div>
        <div className="mt-4 h-30">
          <div>
            {locale === "zh-CN" ? (
              <>
                <span className="text-3xl font-bold">
                  {t("currency")}
                  {productPrices["TEAMSEAT1MONTH"]["CNY"] * 3}
                </span>
                <span className="text-lg">{t("startingFrom")}</span>
              </>
            ) : (
              <>
                <span className="text-lg">{t("startingFrom")} </span>
                <span className="text-3xl font-bold">
                  {t("currency")}
                  {productPrices["TEAMSEAT1MONTH"]["USD"] * 3}
                </span>
              </>
            )}
          </div>
          <div className="mt-1 text-sm font-medium">
            {t("currency")}
            {locale === "zh-CN"
              ? productPrices["TEAMSEAT1MONTH"]["CNY"]
              : productPrices["TEAMSEAT1MONTH"]["USD"]}
            {t("perSeat")} · {t("teamMinimumSeats")}
          </div>
          <div className="mt-1 flex items-start">
            <CoinsIcon className="size-4 mt-1 mr-2 shrink-0" />
            <span className="leading-5">{t("teamMonthlyTokens")}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grow space-y-4">
        {isAwsMarketplaceUser ? (
          <Button className="w-full mb-6 text-xs" disabled>
            {t("manageViaAwsMarketplace")}
          </Button>
        ) : userType === "TeamMember" && onPurchase ? (
          activeSubscription?.plan === "team" || activeSubscription?.plan === "superteam" ? (
            <Button className="w-full mb-6" disabled variant="secondary">
              {activeSubscription.plan === "team" ? t("purchasedTeam") : t("purchasedSuperTeam")}
            </Button>
          ) : (
            <Button className="w-full mb-6" onClick={onPurchase}>
              {t("purchaseTeam")}
            </Button>
          )
        ) : (
          <TeamCreateButton>
            <Button className="w-full mb-6" disabled={userType !== "Personal"}>
              {t("createTeam")}
            </Button>
          </TeamCreateButton>
        )}
        <div className="text-sm text-muted-foreground bg-muted/50 rounded p-3 mb-2">
          {t("additionalTokenPurchaseInfo")}
        </div>
        <FeatureItem text={t("features.allMaxFeatures")} />
        <FeatureItem text={t("features.interviews.unlimited")} />
        <FeatureItem text={t("features.personas.humanPersonaImports")} />
        <FeatureItem text={t("features.knowledgeBase")} />
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
