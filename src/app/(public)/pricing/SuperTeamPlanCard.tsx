import { TProductPrices } from "@/app/payment/actions";
import { TeamCreateButton } from "@/app/team/components/TeamCreateButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserType } from "@/prisma/client";
import { CheckIcon, Infinity } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface SuperTeamPlanCardProps {
  productPrices: TProductPrices;
  userType: UserType;
}

export function SuperTeamPlanCard({ productPrices, userType }: SuperTeamPlanCardProps) {
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
        <CardTitle className="text-2xl">{t("superteamTitle")}</CardTitle>
        <CardDescription className="h-12">{t("superteamSubtitle")}</CardDescription>
        <div className="mt-4 h-30">
          <div>
            {locale === "zh-CN" ? (
              <>
                <span className="text-3xl font-bold">
                  {t("currency")}
                  {productPrices["SUPERTEAMSEAT1MONTH"]["CNY"] * 3}
                </span>
                <span className="text-lg">{t("startingFrom")}</span>
              </>
            ) : (
              <>
                <span className="text-lg">{t("startingFrom")} </span>
                <span className="text-3xl font-bold">
                  {t("currency")}
                  {productPrices["SUPERTEAMSEAT1MONTH"]["USD"] * 3}
                </span>
              </>
            )}
          </div>
          <div className="mt-1 text-sm font-medium">
            {t("currency")}
            {locale === "zh-CN"
              ? productPrices["SUPERTEAMSEAT1MONTH"]["CNY"]
              : productPrices["SUPERTEAMSEAT1MONTH"]["USD"]}
            {t("perSeat")} · {t("teamMinimumSeats")}
          </div>
          <div className="mt-1 flex items-center">
            <Infinity className="size-4 mr-2 text-primary" />
            <span className="font-semibold">{t("superMonthlyTokens")}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grow space-y-4">
        <TeamCreateButton>
          <Button className="w-full mb-6" disabled={userType !== "Personal"}>
            {t("createTeam")}
          </Button>
        </TeamCreateButton>
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
