import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";

interface EnterprisePlanCardProps {
  onContactSales: () => void;
}

export function EnterprisePlanCard({ onContactSales }: EnterprisePlanCardProps) {
  const locale = useLocale();
  const t = useTranslations("PricingPage");

  return (
    <Card className="flex flex-col not-dark:border-muted/40">
      <CardHeader>
        <CardTitle className="text-2xl">{t("enterpriseTitle")}</CardTitle>
        <CardDescription className="h-12">{t("enterpriseSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <Button className="w-full mb-6" variant="outline" onClick={onContactSales}>
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
