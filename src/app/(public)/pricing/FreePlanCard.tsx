import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Subscription } from "@/prisma/client";
import { CheckIcon, CoinsIcon, InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface FreePlanCardProps {
  activeSubscription: Subscription | null;
}

export function FreePlanCard({ activeSubscription }: FreePlanCardProps) {
  const t = useTranslations("PricingPage");

  return (
    <Card className="flex flex-col not-dark:border-muted/40">
      <CardHeader>
        <CardTitle className="text-2xl">{t("freeTitle")}</CardTitle>
        <CardDescription className="h-12">{t("freeSubtitle")}</CardDescription>
        <div className="mt-4 h-30">
          <div className="text-3xl font-bold">{t("freePrice")}</div>
          <div className="mt-1 flex items-center">
            <CoinsIcon className="size-4 mr-2" />
            <span className="mr-1">{t("freeTokens")}</span>
            <TokenUsageTooltip />
          </div>
        </div>
      </CardHeader>
      <CardContent className="grow space-y-4">
        {activeSubscription ? (
          <Button className="w-full mb-6" disabled>
            {t("getStarted")}
          </Button>
        ) : (
          <Button className="w-full mb-6" asChild>
            <Link href="/auth/signup">{t("getStarted")}</Link>
          </Button>
        )}
        <div className="text-sm text-muted-foreground bg-muted/50 rounded p-3 mb-2">
          {t("features.tokenPurchase.notAvailable")}
        </div>
        <FeatureItem text={t("features.socialPlatforms.single")} />
        <FeatureItem text={t("features.personas.limited")} />
        <FeatureItem text={t("features.analysisModel.standard")} />
        <FeatureItem text={t("features.personaImport.basic")} />
        <FeatureItem text={t("features.interviewProject.basic")} />
      </CardContent>
    </Card>
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

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-start text-sm">
      <CheckIcon className="size-4 text-primary mr-2 mt-0.5" />
      <span className="flex-1">{text}</span>
    </div>
  );
}
