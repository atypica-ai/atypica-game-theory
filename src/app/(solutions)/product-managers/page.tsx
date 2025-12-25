import { generatePageMetadata } from "@/lib/request/metadata";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import ProductManagersPage from "./ProductManagersPage";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Solutions.ProductManagersPage.metadata");

  return generatePageMetadata({
    title: t("title"),
    description: t("description"),
    locale,
  });
}

export default function Page() {
  return <ProductManagersPage />;
}
