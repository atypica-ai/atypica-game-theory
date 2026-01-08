import "server-only";

import { llm } from "@/ai/provider";
import { getSubstackPosts } from "@/app/blog/lib";
import { rootLogger } from "@/lib/logging";
import type { BlogArticleExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";

// Internal auth validation helper
function validateInternalAuth(request: NextRequest): boolean {
  const internalSecret = request.headers.get("x-internal-secret");
  return internalSecret === process.env.INTERNAL_API_SECRET;
}

export async function POST(request: NextRequest) {
  const logger = rootLogger.child({ api: "sync-blog-articles" });

  // Validate internal authentication
  if (!validateInternalAuth(request)) {
    logger.warn({ msg: "Unauthorized access to sync blog articles API" });
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  logger.info({ msg: "Starting blog articles sync from Substack RSS" });

  try {
    // Fetch latest posts from Substack RSS
    const posts = await getSubstackPosts();
    logger.info({ msg: "Fetched posts from Substack", count: posts.length });

    let synced = 0;
    let skipped = 0;
    let translated = 0;
    const errors: Array<{ slug: string; error: string }> = [];

    for (const post of posts) {
      try {
        if (!post.slug) {
          logger.warn({ msg: "Post without slug, skipping", title: post.title });
          continue;
        }

        // Check if English version already exists
        const existingEnPost = await prisma.blogArticle.findUnique({
          where: { locale_slug: { locale: "en-US", slug: post.slug } },
        });

        if (existingEnPost) {
          logger.debug({ msg: "Post already exists, skipping", slug: post.slug });
          skipped++;
          continue;
        }

        // Create English version (original HTML content)
        const enExtra: BlogArticleExtra = {
          contentType: "html",
          coverObjectUrl: post.coverImage,
          originalUrl: post.link,
        };

        await prisma.blogArticle.create({
          data: {
            title: post.title || "Untitled",
            content: post.content || "",
            slug: post.slug,
            publishedAt: post.pubDate ? new Date(post.pubDate) : null,
            locale: "en-US",
            extra: enExtra,
          },
        });

        synced++;
        logger.info({ msg: "Created English article", slug: post.slug });

        // Translate to Chinese using Haiku 4.5
        const [translatedTitle, translatedContent] = await Promise.all([
          // Translate title
          generateText({
            model: llm("claude-haiku-4-5"),
            prompt: `请将以下英文博客标题翻译成简体中文，只返回翻译后的标题，不要添加任何额外说明：

${post.title}`,
          }),
          // Translate content (HTML to Markdown)
          generateText({
            model: llm("claude-haiku-4-5"),
            prompt: `请将以下英文博客文章（HTML格式）翻译成简体中文，并输出为 Markdown 格式。

要求：
- 保留标题层级（使用 # ## ### 等）
- 保留图片和链接
- 确保 Markdown 格式规范
- 只返回翻译后的 Markdown 内容，不要添加任何额外说明

HTML 内容：
${post.content}`,
          }),
        ]);

        // Create Chinese version
        const zhExtra: BlogArticleExtra = {
          contentType: "markdown",
          coverObjectUrl: post.coverImage,
          originalUrl: post.link,
        };

        await prisma.blogArticle.create({
          data: {
            title: translatedTitle.text.trim(),
            content: translatedContent.text.trim(),
            slug: post.slug,
            publishedAt: post.pubDate ? new Date(post.pubDate) : null,
            locale: "zh-CN",
            extra: zhExtra,
          },
        });

        translated++;
        logger.info({ msg: "Created Chinese article", slug: post.slug });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        errors.push({ slug: post.slug, error: errorMessage });
        logger.error({
          msg: "Failed to sync post",
          slug: post.slug,
          error: errorMessage,
        });
      }
    }

    const result = {
      success: true,
      totalPosts: posts.length,
      synced,
      skipped,
      translated,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    };

    logger.info({ msg: "Blog sync completed", result });
    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ msg: "Failed to sync blog articles", error: errorMessage });
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// Only allow POST method
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
