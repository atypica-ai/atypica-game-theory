import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import Link from "next/link";
import { categoryLabels, getDocsByCategory } from "../types";
import { docs } from "./docs-config";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();

  return generatePageMetadata({
    title: locale === "zh-CN" ? "产品文档" : "Product Documentation",
    description:
      locale === "zh-CN"
        ? "atypica.AI 产品功能文档、产品对比和使用指南"
        : "atypica.AI product features, product comparisons, and user guides",
    locale,
  });
}

export default async function FeaturesIndexPage() {
  const locale = await getLocale();
  const isZh = locale === "zh-CN";

  const features = getDocsByCategory(docs, "feature");
  const competitors = getDocsByCategory(docs, "competitor");

  // Split competitors into AI products and traditional companies
  const aiProducts = competitors.filter((doc) => doc.filePathZh.includes("/ai-products/"));
  const traditional = competitors.filter((doc) => doc.filePathZh.includes("/traditional/"));

  return (
    <div className="mx-auto max-w-6xl w-full px-4 py-16 md:py-24">
      {/* Hero Section */}
      <header className="mb-20 md:mb-32 text-center">
        <h1 className="mb-6 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
          {isZh ? "产品文档" : "Product Documentation"}
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          {isZh
            ? "深入了解 atypica.AI 的功能特性与产品对比"
            : "Explore atypica.AI's features and product comparisons"}
        </p>
      </header>

      {/* Features Section */}
      {features.length > 0 && (
        <section className="mb-20 md:mb-32">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            {isZh ? categoryLabels.feature.zh : categoryLabels.feature.en}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {features.map((doc) => (
              <Link
                key={doc.slug}
                href={`/features/${doc.slug}`}
                className="group flex items-center justify-between py-4 px-5 rounded-lg hover:bg-muted transition-all"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium mb-1 line-clamp-2">
                    {isZh ? doc.titleZh : doc.titleEn}
                  </h3>
                  {doc.descriptionZh && doc.descriptionEn && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {isZh ? doc.descriptionZh : doc.descriptionEn}
                    </p>
                  )}
                </div>
                <svg
                  className="shrink-0 ml-3 size-5 text-muted-foreground group-hover:translate-x-1 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Comparisons Section */}
      {competitors.length > 0 && (
        <section className="space-y-16 md:space-y-20">
          <h2 className="text-2xl md:text-3xl font-bold text-center">
            {isZh ? categoryLabels.competitor.zh : categoryLabels.competitor.en}
          </h2>

          {/* AI Products */}
          {aiProducts.length > 0 && (
            <div>
              <h3 className="text-xl md:text-2xl font-semibold text-center mb-8">
                {isZh ? "AI 产品" : "AI Products"}
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {aiProducts.map((doc) => (
                  <Link
                    key={doc.slug}
                    href={`/features/${doc.slug}`}
                    className="group flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted transition-all"
                  >
                    <h4 className="flex-1 text-sm font-medium line-clamp-1">
                      {isZh ? doc.titleZh : doc.titleEn}
                    </h4>
                    <svg
                      className="shrink-0 ml-2 size-4 text-muted-foreground group-hover:translate-x-1 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Traditional Consulting */}
          {traditional.length > 0 && (
            <div>
              <h3 className="text-xl md:text-2xl font-semibold text-center mb-8">
                {isZh ? "传统咨询公司" : "Traditional Consulting"}
              </h3>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {traditional.map((doc) => (
                  <Link
                    key={doc.slug}
                    href={`/features/${doc.slug}`}
                    className="group flex items-center justify-between py-3 px-4 rounded-lg hover:bg-muted transition-all"
                  >
                    <h4 className="flex-1 text-sm font-medium line-clamp-1">
                      {isZh ? doc.titleZh : doc.titleEn}
                    </h4>
                    <svg
                      className="shrink-0 ml-2 size-4 text-muted-foreground group-hover:translate-x-1 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
