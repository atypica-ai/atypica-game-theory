import { getLocale } from "next-intl/server";
import Link from "next/link";

export default async function NotFound() {
  const locale = await getLocale();

  const title = locale === "zh-CN" ? "文章未找到" : "Post Not Found";
  const description =
    locale === "zh-CN"
      ? "抱歉，我们找不到您要查找的博客文章。"
      : "Sorry, we couldn't find the blog post you're looking for.";
  const backToBlog = locale === "zh-CN" ? "返回博客列表" : "Back to Blog";

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="mb-4 text-4xl font-bold">{title}</h1>
      <p className="mb-8 text-lg text-muted-foreground">{description}</p>
      <Link
        href="/blog"
        className="inline-block rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {backToBlog}
      </Link>
    </div>
  );
}
