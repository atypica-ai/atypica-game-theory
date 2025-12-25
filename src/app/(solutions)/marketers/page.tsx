import { generatePageMetadata } from "@/lib/request/metadata";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import MarketersPage from "./MarketersPage";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Solutions.MarketersPage.metadata");

  return generatePageMetadata({
    title: t("title"),
    description: t("description"),
    locale,
  });
}

export default function Page() {
  return <MarketersPage />;
}
