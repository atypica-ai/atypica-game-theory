import { generatePageMetadata } from "@/lib/request/metadata";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { SageSourcesPageClient } from "./SageSourcesPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Sage.SourcesPage");
  return generatePageMetadata({
    title: t("title"),
    description: t("description"),
    locale,
  });
}

export default async function SageSourcesPage() {
  return <SageSourcesPageClient />;
}
