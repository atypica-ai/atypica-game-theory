import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Affiliate } from "./Affiliate";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("AffiliatePage");

  return generatePageMetadata({
    title: t("hero.cta"),
    description: t("hero.description"),
    locale,
  });
}

export default function AffiliatePage() {
  return <Affiliate />;
}

