import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckIcon, CoinsIcon, HeadphonesIcon, SparklesIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface EnterprisePlanCardProps {
  productPrices?: any;
  onContactSales: () => void;
}

export function EnterprisePlanCard({ productPrices, onContactSales }: EnterprisePlanCardProps) {
  const locale = useLocale();
  const t = useTranslations("PricingPage");

  return (
    <Card className="flex flex-col not-dark:border-muted/40">
      <CardHeader>
        <CardTitle className="text-2xl">{t("enterpriseTitle")}</CardTitle>
        <CardDescription className="h-12">{t("enterpriseSubtitle")}</CardDescription>
        <div className="mt-4 h-30">
          <div>
            <span className="text-3xl font-bold">{locale === "zh-CN" ? "¥15000" : "$2000"}</span>
            <span className="text-lg">/{t("month")}</span>
          </div>
          <div className="mt-1 text-sm font-medium">{t("enterpriseUnlimitedSeats")}</div>
          <div className="mt-1 flex items-start">
            <CoinsIcon className="size-4 mt-1 mr-2 shrink-0" />
            <span className="leading-5">{t("enterpriseMonthlyTokens")}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <Button className="w-full mb-6" onClick={onContactSales}>
          {t("contactSales")}
        </Button>
        <div className="text-sm text-muted-foreground bg-muted/50 rounded p-3 mb-2">
          {t("additionalTokenPurchaseInfo")}
        </div>
        <FeatureItem text={t("features.enterprise.aiResearch")} />
        <FeatureItem text={t("features.enterprise.aiInterview")} />
        <FeatureItem text={t("features.enterprise.aiPersona")} />
        <FeatureItem text={t("features.enterprise.aiPanel")} />
        <FeatureItem text={t("features.enterprise.aiProductRnD")} />
        <FeatureItem text={t("features.enterprise.enterpriseReportTemplates")} />
        <FeatureItem text={t("features.enterprise.enterpriseKnowledgeBase")} />
        <FeatureItem text={t("features.enterprise.apiInterface")} />
        <ServiceItem icon={HeadphonesIcon} text={t("features.enterprise.customerSuccessServices")} />
        <ServiceItem icon={SparklesIcon} text={t("features.enterprise.enterpriseAdvancedServices")} />
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

function ServiceItem({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="flex items-start text-sm">
      <Icon className="size-4 text-primary mr-2 mt-0.5" />
      <span className="flex-1">{text}</span>
    </div>
  );
}
