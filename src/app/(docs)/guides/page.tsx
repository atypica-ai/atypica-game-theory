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
    <div className="mx-auto max-w-6xl w-full px-4 py-8">
      <header className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">{isZh ? "使用指南" : "User Guides"}</h1>
        <p className="text-lg text-muted-foreground">
          {isZh
            ? "从入门到进阶，全面掌握 atypica.AI 的使用方法"
            : "From beginner to advanced, master how to use atypica.AI"}
        </p>
      </header>

      {/* Hero guide */}
      {gettingStarted && (
        <Link
          href={`/guides/${gettingStarted.slug}`}
          className="group block mb-12 p-8 border-2 border-primary rounded-lg hover:shadow-xl transition-all bg-linear-to-br from-primary/5 to-transparent"
        >
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
              🚀
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                {isZh ? gettingStarted.titleZh : gettingStarted.titleEn}
              </h2>
              <p className="text-muted-foreground">
                {isZh ? gettingStarted.descriptionZh : gettingStarted.descriptionEn}
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Guides by category */}
      <div className="space-y-12">
        {displayOrder.map((category) => {
          const guides = guidesByCategory[category];
          if (guides.length === 0) return null;

          return (
            <section key={category} className="space-y-4">
              <h2 className="text-2xl font-semibold border-b pb-2">
                {isZh
                  ? displayCategoryMapping[category].labelZh
                  : displayCategoryMapping[category].labelEn}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {guides.map((guide) => (
                  <Link
                    key={guide.slug}
                    href={`/guides/${guide.slug}`}
                    className="group block p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all"
                  >
                    <h3 className="text-lg font-medium mb-1 group-hover:text-primary transition-colors line-clamp-2">
                      {isZh ? guide.titleZh : guide.titleEn}
                    </h3>
                    {guide.descriptionZh && guide.descriptionEn && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {isZh ? guide.descriptionZh : guide.descriptionEn}
                      </p>
                    )}
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
