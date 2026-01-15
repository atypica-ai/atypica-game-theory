import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import Link from "next/link";
import { categoryLabels, getDocsByCategory, type DocCategory } from "./docs-config";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();

  return generatePageMetadata({
    title: locale === "zh-CN" ? "产品文档" : "Product Documentation",
    description:
      locale === "zh-CN"
        ? "atypica.AI 产品功能文档、竞品对比和使用指南"
        : "atypica.AI product features, competitor comparisons, and user guides",
    locale,
  });
}

export default async function FeaturesIndexPage() {
  const locale = await getLocale();
  const isZh = locale === "zh-CN";

  const categories: DocCategory[] = ["features", "competitors", "guides"];

  return (
    <div className="mx-auto max-w-6xl w-full px-4 py-8">
      <header className="mb-12">
        <h1 className="mb-4 text-4xl font-bold">{isZh ? "产品文档" : "Product Documentation"}</h1>
        <p className="text-lg text-muted-foreground">
          {isZh
            ? "深入了解 atypica.AI 的功能特性、竞品对比和使用指南"
            : "Explore atypica.AI's features, competitor comparisons, and user guides"}
        </p>
      </header>

      <div className="space-y-12">
        {categories.map((category) => {
          const categoryDocs = getDocsByCategory(category);
          if (categoryDocs.length === 0) return null;

          return (
            <section key={category} className="space-y-4">
              <h2 className="text-2xl font-semibold border-b pb-2">
                {isZh ? categoryLabels[category].zh : categoryLabels[category].en}
              </h2>
              <div className="grid gap-6 md:grid-cols-2">
                {categoryDocs.map((doc) => (
                  <Link
                    key={doc.slug}
                    href={`/features/${doc.slug}`}
                    className="group block p-6 border rounded-lg hover:border-primary hover:shadow-md transition-all"
                  >
                    <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                      {isZh ? doc.titleZh : doc.titleEn}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {isZh ? doc.descriptionZh : doc.descriptionEn}
                    </p>
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
