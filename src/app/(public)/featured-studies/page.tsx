import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import FeaturedStudiesClient from "./FeaturedStudiesClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === "zh-CN" ? "精选研究" : "Featured Studies";
  const description =
    locale === "zh-CN"
      ? "浏览我们精选的市场分析研究报告集合。"
      : "Browse our collection of featured market analysis studies.";

  return generatePageMetadata({
    title,
    description,
    locale,
  });
}

export default async function FeaturedStudiesPage() {
  return <FeaturedStudiesClient />;
}
