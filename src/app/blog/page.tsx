import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { getSubstackPosts } from "./lib";

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

export default async function BlogPage() {
  const posts = await getSubstackPosts();
  const locale = await getLocale();

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
        {posts.map((post) => (
          <article key={post.slug} className="group border-b pb-8 last:border-b-0">
            <Link href={`/blog/${post.slug}`} className="block">
              <div className="grid gap-6 md:grid-cols-[300px_1fr] items-start">
                {post.coverImage && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={post.coverImage}
                      alt={post.title || "Blog post cover"}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 300px"
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>

                  {post.pubDate && (
                    <time className="text-sm text-muted-foreground">
                      {new Date(post.pubDate).toLocaleDateString(
                        locale === "zh-CN" ? "zh-CN" : "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    </time>
                  )}

                  {post.excerpt && (
                    <p className="text-muted-foreground line-clamp-3">{post.excerpt}</p>
                  )}

                  <span className="inline-block text-sm text-primary group-hover:underline">
                    {readMore}
                  </span>
                </div>
              </div>
            </Link>
          </article>
        ))}

        {posts.length === 0 && <p className="text-center text-muted-foreground py-12">{noPosts}</p>}
      </div>
    </div>
  );
}

// Revalidate every hour
export const revalidate = 3600;
