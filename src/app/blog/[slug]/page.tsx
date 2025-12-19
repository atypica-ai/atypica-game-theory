import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getPostBySlug, getSubstackPosts } from "../lib";
import "./blog.css";

// Generate static params for all blog posts
export async function generateStaticParams() {
  const posts = await getSubstackPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

// Generate metadata for each blog post
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  const locale = await getLocale();

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  const baseMetadata = generatePageMetadata({
    title: post.title,
    description: post.excerpt,
    image: post.coverImage,
    locale,
  });

  return {
    ...baseMetadata,
    alternates: {
      canonical: post.link,
    },
    openGraph: {
      ...baseMetadata.openGraph,
      type: "article",
      publishedTime: post.pubDate,
    },
  };
}

// Blog post page component
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  const locale = await getLocale();

  if (!post) {
    notFound();
  }

  const readOnSubstack = locale === "zh-CN" ? "在 Substack 上阅读 →" : "Read on Substack →";

  return (
    <article className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-2">
        {/* post.content 已经包含了 title */}
        {/*<h1 className="mb-4 text-4xl font-bold">{post.title}</h1>*/}
        {post.pubDate && (
          <time className="text-sm text-muted-foreground">
            {new Date(post.pubDate).toLocaleDateString(locale === "zh-CN" ? "zh-CN" : "en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </time>
        )}
      </header>

      {post.content && (
        <div className="blog-article" dangerouslySetInnerHTML={{ __html: post.content }} />
      )}

      {post.link && (
        <footer className="mt-8 border-t pt-4">
          <a
            href={post.link}
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

// Revalidate every hour
export const revalidate = 3600;
