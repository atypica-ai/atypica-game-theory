import { generatePageMetadata } from "@/lib/request/metadata";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SageSourcesPageClient } from "./SageSourcesPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Sage.SourcesPage");
  return generatePageMetadata({
    title: t("title"),
    description: t("description"),
  });
}

export default async function SageSourcesPage() {
  return <SageSourcesPageClient />;
}
