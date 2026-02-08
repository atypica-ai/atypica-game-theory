import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import Link from "next/link";
import type { DisplayCategory } from "../types";
import { displayCategoryMapping, groupDocsByDisplayCategory } from "../display-category-mapping";
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
    <div className="mx-auto max-w-6xl w-full px-4 py-8">
      <header className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">{isZh ? "常见问题" : "FAQ"}</h1>
        <p className="text-lg text-muted-foreground">
          {isZh
            ? "关于 atypica.AI 的常见问题解答，帮助你更好地使用我们的产品"
            : "Frequently asked questions about atypica.AI to help you better use our product"}
        </p>
      </header>

      {/* FAQs by category */}
      <div className="space-y-12">
        {displayOrder.map((category) => {
          const faqs = faqsByCategory[category];
          if (faqs.length === 0) return null;

          return (
            <section key={category} className="space-y-4">
              <h2 className="text-2xl font-semibold border-b pb-2">
                {isZh
                  ? displayCategoryMapping[category].labelZh
                  : displayCategoryMapping[category].labelEn}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {faqs.map((faq) => (
                  <Link
                    key={faq.slug}
                    href={`/faq/${faq.slug}`}
                    className="group block p-4 border rounded-lg hover:border-primary hover:shadow-md transition-all"
                  >
                    <h3 className="text-lg font-medium mb-1 group-hover:text-primary transition-colors line-clamp-2">
                      {isZh ? faq.titleZh : faq.titleEn}
                    </h3>
                    {faq.descriptionZh && faq.descriptionEn && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {isZh ? faq.descriptionZh : faq.descriptionEn}
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
