import { generatePageMetadata } from "@/lib/request/metadata";
import type { BlogArticleExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Streamdown } from "streamdown";

// Generate static params for all blog posts
export async function generateStaticParams() {
  const articles = await prisma.blogArticle.findMany({
    select: { slug: true, locale: true },
  });

  // Group by slug to avoid duplicates
  const uniqueSlugs = [...new Set(articles.map((a) => a.slug))];
  return uniqueSlugs.map((slug) => ({ slug }));
}

// Generate metadata for each blog post
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getLocale();

  const article = await prisma.blogArticle.findUnique({
    where: { locale_slug: { locale, slug } },
  });

  if (!article) {
    return {
      title: "Post Not Found",
    };
  }

  const extra = article.extra as BlogArticleExtra;

  const baseMetadata = generatePageMetadata({
    title: article.title,
    image: extra?.coverObjectUrl,
    locale,
  });

  return {
    ...baseMetadata,
    // alternates: {
    //   canonical: extra?.originalUrl,
    // },
    openGraph: {
      ...baseMetadata.openGraph,
      type: "article",
      publishedTime: article.publishedAt?.toISOString(),
    },
  };
}

// Blog post page component
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();

  const article = await prisma.blogArticle.findUnique({
    where: { locale_slug: { locale, slug } },
  });

  if (!article) {
    notFound();
  }

  const extra = article.extra as BlogArticleExtra;
  const readOnSubstack = locale === "zh-CN" ? "在 Substack 上阅读 →" : "Read on Substack →";

  return (
    <article className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8">
        <h1 className="mb-4 text-4xl font-bold">{article.title}</h1>
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
      </header>

      <div className="prose prose-zinc dark:prose-invert max-w-none">
        <Streamdown>{article.content}</Streamdown>
      </div>

      {extra?.originalUrl && (
        <footer className="mt-8 border-t pt-4">
          <a
            href={extra.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {readOnSubstack}
          </a>
        </footer>
      )}
    </article>
  );
}
