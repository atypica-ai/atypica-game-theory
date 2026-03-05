import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { PanelHomePage } from "./PanelHomePage";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("PersonaPanel.HomePage");
  return generatePageMetadata({
    title: t("headline"),
    description: t("description"),
    locale,
  });
}

export default function PanelHomePageRoute() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PanelHomePage />
    </Suspense>
  );
}
