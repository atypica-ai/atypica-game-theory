"use client";
import { AddTokensDialog } from "@/app/payment/components/AddTokensDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckIcon, GiftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { sayHelloToSales } from "./enterprise";

export default function PricingPageClient() {
  const t = useTranslations("PricingPage");
  const [isTokensDialogOpen, setIsTokensDialogOpen] = useState(false);

  return (
    <div className={cn("flex-1 overflow-y-auto scrollbar-thin", "px-4 py-16")}>
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">{t("title")}</h1>
        <p className="text-xl text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="md:py-24 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
        {/* Free Plan */}
        <Card className="flex flex-col border-muted/40">
          <CardHeader>
            <CardTitle className="text-2xl">{t("freeTitle")}</CardTitle>
            <CardDescription className="h-12">{t("freeSubtitle")}</CardDescription>
            <div className="mt-4 h-30">
              <div className="text-3xl font-bold">{t("freePrice")}</div>
              <div className="mt-1">{t("freeTokens")}</div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow space-y-4">
            <div className="mb-6">
              <Button className="w-full" asChild>
                <Link href="/auth/signup">{t("getStarted")}</Link>
              </Button>
            </div>
            <FeatureItem text={t("features.socialPlatforms.single")} />
            <FeatureItem text={t("features.personas.limited")} />
            <FeatureItem text={t("features.analysisModel.standard")} />
          </CardContent>
        </Card>

        {/* Basic Plan */}
        <Card className="flex flex-col border-muted/40">
          <CardHeader>
            <CardTitle className="text-2xl">{t("basicTitle")}</CardTitle>
            <CardDescription className="h-12">{t("basicSubtitle")}</CardDescription>
            <div className="mt-4 h-30">
              <div>
                <span className="text-3xl font-bold">{t("basicPrice")}</span>
                <span className="text-lg">/{t("basicPerTokens")}</span>
              </div>
              <div className="mt-1">{t("basicPurchaseTokens")}</div>
              <div className="mt-2 text-muted-foreground text-xs">{t("averageStudyToken")}</div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow space-y-4">
            <div className="mb-6">
              <Button className="w-full" onClick={() => setIsTokensDialogOpen(true)}>
                {t("chooseBasic")}
              </Button>
            </div>
            <FeatureItem text={t("features.socialPlatforms.multiple")} />
            <FeatureItem text={t("features.personas.limited")} />
            <FeatureItem text={t("features.reports.followUp")} />
            <div className="flex items-start text-sm">
              <GiftIcon className="size-4 text-primary mr-2 mt-0.5" />
              <span className="flex-1">{t("features.tokens.basicGift")}</span>
            </div>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="flex flex-col relative border-primary/50 shadow-md">
          <div className="absolute -top-4 left-0 right-0 flex justify-center">
            <div className="bg-primary text-primary-foreground px-4 py-1 text-sm rounded-full font-medium">
              Popular
            </div>
          </div>
          <CardHeader>
            <CardTitle className="text-2xl">{t("proTitle")}</CardTitle>
            <CardDescription className="h-12">{t("proSubtitle")}</CardDescription>
            <div className="mt-4 h-30">
              <div>
                <span className="text-3xl font-bold">{t("proPrice")}</span>
                <span className="text-lg">/{t("proPerMonth")}</span>
              </div>
              <div className="mt-1">{t("proMonthlyTokens")}</div>
              <div className="mt-2 text-muted-foreground text-xs">{t("averageStudyToken")}</div>
            </div>
          </CardHeader>
          <CardContent className="flex-grow space-y-4">
            <div className="mb-6">
              <Button className="w-full">{t("upgradeToPro")}</Button>
            </div>
            <FeatureItem text={t("features.socialPlatforms.multiple")} />
            <FeatureItem text={t("features.personas.unlimited")} />
            <FeatureItem text={t("features.reports.followUp")} />
            <FeatureItem text={t("features.analysisModel.enhanced")} />
            <div className="flex items-start text-sm">
              <GiftIcon className="size-4 text-primary mr-2 mt-0.5" />
              <span className="flex-1">{t("features.tokens.proGift")}</span>
            </div>
          </CardContent>
        </Card>

        {/* Enterprise Plan */}
        <Card className="flex flex-col border-muted/40">
          <CardHeader>
            <CardTitle className="text-2xl">{t("enterpriseTitle")}</CardTitle>
            <CardDescription>{t("enterpriseSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-3">
            <div className="mb-6">
              <Button className="w-full" variant="outline" onClick={() => sayHelloToSales()}>
                {t("contactSales")}
              </Button>
            </div>
            <h3 className="font-medium mb-3">{t("features.enterprise.AdvancedAnalysisTools")}:</h3>
            <FeatureItem text={t("features.multiModal")} />
            <FeatureItem text={t("features.analysisModel.superior")} />
            <FeatureItem text={t("features.customReports")} />
            <FeatureItem text={t("features.reports.followUp")} />
            <FeatureItem text={t("features.reports.deepDive")} />
            <h3 className="font-medium mb-3 mt-6">{t("features.enterprise.DataIntegration")}:</h3>
            <FeatureItem text={t("features.socialPlatforms.multiple")} />
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

      <AddTokensDialog open={isTokensDialogOpen} onOpenChange={setIsTokensDialogOpen} />
    </div>
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
