import { generatePageMetadata } from "@/lib/request/metadata";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import StartupOwnerPage from "./StartupOwnerPage";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("StartupOwnerPage.HeroSection");

  return generatePageMetadata({
    title: t("title"),
    description: t("subtitle"),
    locale: locale as "en-US" | "zh-CN",
  });
}

export default function Page() {
  return <StartupOwnerPage />;
}
