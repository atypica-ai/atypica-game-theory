import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import PricingPageClient from "./PricingPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PricingPage");
  return {
    title: `${t("title")}`,
    description: t("subtitle"),
  };
}

export default async function PricingPage() {
  return <PricingPageClient />;
}
