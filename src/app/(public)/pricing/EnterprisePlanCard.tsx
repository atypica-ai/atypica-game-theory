import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRightIcon,
  CheckIcon,
  CoinsIcon,
  HeadphonesIcon,
  LucideIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

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
        <div className="h-12">
          <CardDescription className="h-6">{t("enterpriseSubtitle")}</CardDescription>
          <Link
            href="/enterprise"
            className="group w-fit flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ShieldCheckIcon className="size-3.5 text-green-500" />
            {t("soc2Compliant")}
            <ArrowRightIcon className="size-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
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
      <CardContent className="grow space-y-4">
        <Button className="w-full mb-2" onClick={onContactSales}>
          {t("contactSales")}
        </Button>
        <Link
          href="/enterprise"
          className="block text-center text-sm text-primary hover:underline mb-4"
        >
          {t("learnMore")}
        </Link>
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
        <ServiceItem
          icon={HeadphonesIcon}
          text={t("features.enterprise.customerSuccessServices")}
          badge={t("paidValueAddedService")}
        />
        <ServiceItem
          icon={SparklesIcon}
          text={t("features.enterprise.enterpriseAdvancedServices")}
          badge={t("paidValueAddedService")}
        />
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

function ServiceItem({
  icon: Icon,
  text,
  badge,
}: {
  icon: LucideIcon;
  text: string;
  badge?: string;
}) {
  return (
    <div className="flex items-start text-sm">
      <Icon className="size-4 text-primary mr-2 mt-0.5 shrink-0" />
      <div className="flex-1 flex flex-col gap-1">
        <span>{text}</span>
        {badge && (
          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold border border-amber-500/20 w-fit">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
