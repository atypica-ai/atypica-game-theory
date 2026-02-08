import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import Link from "next/link";
import { displayCategoryMapping, groupDocsByDisplayCategory } from "../display-category-mapping";
import type { DisplayCategory } from "../types";
import { docs } from "./docs-config";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();

  return generatePageMetadata({
    title: locale === "zh-CN" ? "常见问题" : "FAQ",
    description:
      locale === "zh-CN"
        ? "atypica.AI 常见问题解答，涵盖市场研究、AI 人设、访谈项目等主题"
        : "atypica.AI frequently asked questions, covering market research, AI personas, interview projects, and more",
    locale,
  });
}

export default async function FAQIndexPage() {
  const locale = await getLocale();
  const isZh = locale === "zh-CN";

  const faqsByCategory = groupDocsByDisplayCategory(docs, "faq");

  // Order of display categories
  const displayOrder: DisplayCategory[] = ["research", "persona", "interview", "sage", "general"];

  return (
    <div className="mx-auto max-w-4xl w-full px-4 py-16 md:py-24">
      {/* Hero Section */}
      <header className="mb-20 md:mb-32 text-center">
        <h1 className="mb-6 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
          {isZh ? "常见问题" : "FAQ"}
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {isZh
            ? "快速找到关于 atypica.AI 的常见问题解答"
            : "Quickly find answers to frequently asked questions about atypica.AI"}
        </p>
      </header>

      {/* FAQs by category */}
      <div className="space-y-20 md:space-y-28">
        {displayOrder.map((category) => {
          const faqs = faqsByCategory[category];
          if (faqs.length === 0) return null;

          return (
            <section key={category}>
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
                {isZh
                  ? displayCategoryMapping[category].labelZh
                  : displayCategoryMapping[category].labelEn}
              </h2>
              <div className="space-y-2">
                {faqs.map((faq) => (
                  <Link
                    key={faq.slug}
                    href={`/faq/${faq.slug}`}
                    className="group flex items-start justify-between py-4 px-5 rounded-lg hover:bg-muted transition-all"
                  >
                    <h3 className="flex-1 text-base font-medium pr-4">
                      {isZh ? faq.titleZh : faq.titleEn}
                    </h3>
                    <svg
                      className="shrink-0 mt-0.5 size-5 text-muted-foreground group-hover:translate-x-1 transition-transform"
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
