import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import Link from "next/link";
import { displayCategoryMapping, groupDocsByDisplayCategory } from "../display-category-mapping";
import type { DisplayCategory } from "../types";
import { getDocsByCategory } from "../types";
import { docs } from "./docs-config";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();

  return generatePageMetadata({
    title: locale === "zh-CN" ? "使用指南" : "User Guides",
    description:
      locale === "zh-CN"
        ? "atypica.AI 使用指南，帮助你快速上手并掌握各项功能"
        : "atypica.AI user guides to help you get started and master all features",
    locale,
  });
}

export default async function GuidesIndexPage() {
  const locale = await getLocale();
  const isZh = locale === "zh-CN";

  const allGuides = getDocsByCategory(docs, "guide");
  const guidesByCategory = groupDocsByDisplayCategory(docs, "guide");

  // Get the getting-started guide as hero
  const gettingStarted = allGuides.find((doc) => doc.slug === "getting-started");

  // Order of display categories
  const displayOrder: DisplayCategory[] = ["research", "persona", "interview", "sage", "general"];

  return (
    <div className="mx-auto max-w-5xl w-full px-4 py-16 md:py-24">
      {/* Hero Section */}
      <header className="mb-20 md:mb-32 text-center">
        <h1 className="mb-6 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
          {isZh ? "使用指南" : "User Guides"}
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          {isZh
            ? "从入门到进阶，全面掌握 atypica.AI 的使用方法"
            : "From beginner to advanced, master how to use atypica.AI"}
        </p>
      </header>

      {/* Getting Started - Featured Guide */}
      {gettingStarted && (
        <Link
          href={`/guides/${gettingStarted.slug}`}
          className="group block mb-20 md:mb-32 p-8 md:p-10 bg-muted rounded-2xl hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
        >
          <div className="flex items-start gap-6">
            <div className="shrink-0 w-14 h-14 rounded-full bg-foreground/5 flex items-center justify-center text-2xl font-bold">
              →
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                {isZh ? gettingStarted.titleZh : gettingStarted.titleEn}
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed">
                {isZh ? gettingStarted.descriptionZh : gettingStarted.descriptionEn}
              </p>
            </div>
            <svg
              className="shrink-0 size-6 text-muted-foreground group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      )}

      {/* Guides by category */}
      <div className="space-y-20 md:space-y-28">
        {displayOrder.map((category) => {
          const guides = guidesByCategory[category];
          if (guides.length === 0) return null;

          return (
            <section key={category}>
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
                {isZh
                  ? displayCategoryMapping[category].labelZh
                  : displayCategoryMapping[category].labelEn}
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {guides.map((guide) => (
                  <Link
                    key={guide.slug}
                    href={`/guides/${guide.slug}`}
                    className="group flex items-center justify-between py-4 px-5 rounded-lg hover:bg-muted transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium mb-1 line-clamp-2">
                        {isZh ? guide.titleZh : guide.titleEn}
                      </h3>
                      {guide.descriptionZh && guide.descriptionEn && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {isZh ? guide.descriptionZh : guide.descriptionEn}
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
          );
        })}
      </div>
    </div>
  );
}
