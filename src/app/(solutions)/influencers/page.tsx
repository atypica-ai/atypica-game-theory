import { generatePageMetadata } from "@/lib/request/metadata";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import InfluencersPage from "./InfluencersPage";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Solutions.InfluencersPage.metadata");

  return generatePageMetadata({
    title: t("title"),
    description: t("description"),
    locale,
  });
}

export default function Page() {
  return <InfluencersPage />;
}
