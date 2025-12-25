import { generatePageMetadata } from "@/lib/request/metadata";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import CreatorPage from "./CreatorPage";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("CreatorPages.HeroSection");

  return generatePageMetadata({
    title: t("title"),
    description: t("subtitle"),
    locale: locale as "en-US" | "zh-CN",
  });
}

export default function Page() {
  return <CreatorPage />;
}
