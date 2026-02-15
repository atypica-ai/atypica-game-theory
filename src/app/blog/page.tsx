import { generatePageMetadata } from "@/lib/request/metadata";
import type { BlogArticleExtra } from "@/prisma/client";
import { prismaRO } from "@/prisma/prisma";
import { Metadata } from "next";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { unstable_cache } from "next/cache";
import Image from "next/image";
import Link from "next/link";

const PAGE_SIZE = 10;

/**
 * Cache blog list with pagination
 * - Function parameters automatically become part of cache key
 * - Actual cache key: ["blog-list", locale, page]
 * - Different parameter combinations have independent cache entries
 * - Cache time: 1 day (86400 seconds)
 */
const getCachedBlogList = unstable_cache(
  async (locale: Locale, page: number) => {
    const where = {
      locale,
      publishedAt: {
        not: null,
      },
    };

    const totalCount = await prismaRO.blogArticle.count({
      where,
    });

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    const articles = await prismaRO.blogArticle.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });

    return { articles, totalCount, totalPages };
  },
  ["blog-list"],
  {
    revalidate: 86400, // 1 day cache
    tags: ["blog-list"],
  },
);

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === "zh-CN" ? "博客" : "Blog";
  const description =
    locale === "zh-CN"
      ? "来自 atypica.AI 的最新见解和更新"
      : "Latest insights and updates from atypica.AI";

  return generatePageMetadata({
    title,
    description,
    locale,
  });
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const locale = await getLocale();
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));

  const { articles, totalPages } = await getCachedBlogList(locale, currentPage);

  const title = locale === "zh-CN" ? "博客" : "Blog";
  const subtitle =
    locale === "zh-CN"
      ? "来自 atypica.AI 的最新见解和更新"
      : "Latest insights and updates from atypica.AI";
  const readMore = locale === "zh-CN" ? "阅读更多 →" : "Read more →";
  const noPosts = locale === "zh-CN" ? "暂无博客文章" : "No blog posts available yet.";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <header className="mb-12">
        <h1 className="mb-4 text-5xl font-bold">{title}</h1>
        <p className="text-lg text-muted-foreground">{subtitle}</p>
      </header>

      <div className="grid gap-8">
        {articles.map((article) => {
          const extra = article.extra as BlogArticleExtra;
          const coverImage = extra?.coverSrc;

          return (
            <article key={article.id} className="group border-b pb-8 last:border-b-0">
              <Link href={`/blog/${article.slug}`} className="block">
                <div className="grid gap-6 md:grid-cols-[300px_1fr] items-start">
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                    {coverImage && /(jpg|jpeg|png|gif|webp)$/.test(coverImage.split("?")[0]) && (
                      <Image
                        src={coverImage}
                        alt={article.title || "Blog post cover"}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 300px"
                      />
                    )}
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-2xl font-semibold group-hover:text-primary transition-colors">
                      {article.title}
                    </h2>
                    {article.publishedAt && (
                      <time className="text-sm text-muted-foreground">
                        {new Date(article.publishedAt).toLocaleDateString(
                          locale === "zh-CN" ? "zh-CN" : "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
                      </time>
                    )}
                    <span className="ml-2 inline-block text-sm text-primary group-hover:underline">
                      {readMore}
                    </span>
                  </div>
                </div>
              </Link>
            </article>
          );
        })}

        {articles.length === 0 && (
          <p className="text-center text-muted-foreground py-12">{noPosts}</p>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-12 flex justify-center gap-2">
          {currentPage > 1 && (
            <Link
              href={`/blog?page=${currentPage - 1}`}
              className="px-4 py-2 rounded-md border hover:bg-accent"
            >
              {locale === "zh-CN" ? "上一页" : "Previous"}
            </Link>
          )}

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            // Show first, last, current, and adjacent pages
            if (
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1)
            ) {
              return (
                <Link
                  key={page}
                  href={`/blog?page=${page}`}
                  className={`px-4 py-2 rounded-md border ${
                    page === currentPage ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                  }`}
                >
                  {page}
                </Link>
              );
            } else if (page === currentPage - 2 || page === currentPage + 2) {
              return (
                <span key={page} className="px-2 py-2">
                  ...
                </span>
              );
            }
            return null;
          })}

          {currentPage < totalPages && (
            <Link
              href={`/blog?page=${currentPage + 1}`}
              className="px-4 py-2 rounded-md border hover:bg-accent"
            >
              {locale === "zh-CN" ? "下一页" : "Next"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
