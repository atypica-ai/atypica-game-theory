"use server";

import { checkAdminAuth } from "@/app/admin/actions";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import type { BlogArticle, BlogArticleExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { revalidateTag } from "next/cache";

type BlogArticleInput = {
  title: string;
  content: string;
  slug: string;
  publishedAt: Date | null;
  locale: string;
  extra: BlogArticleExtra;
};

/**
 * Fetch blog articles for admin with pagination
 */
export async function fetchBlogArticles({
  locale,
  page = 1,
  pageSize = 20,
}: {
  locale?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<ServerActionResult<BlogArticle[]>> {
  await checkAdminAuth("SUPER_ADMIN");

  const skip = (page - 1) * pageSize;

  const where = locale ? { locale } : {};

  const [articles, totalCount] = await Promise.all([
    prisma.blogArticle.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.blogArticle.count({ where }),
  ]);

  return {
    success: true,
    data: articles,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

/**
 * Get a single blog article by ID
 */
export async function getBlogArticle(id: number): Promise<ServerActionResult<BlogArticle>> {
  await checkAdminAuth("SUPER_ADMIN");

  const article = await prisma.blogArticle.findUnique({
    where: { id },
  });

  if (!article) {
    return {
      success: false,
      code: "not_found",
      message: "Blog article not found",
    };
  }

  return {
    success: true,
    data: article,
  };
}

/**
 * Create a new blog article
 */
export async function createBlogArticle(
  data: BlogArticleInput,
): Promise<ServerActionResult<BlogArticle>> {
  await checkAdminAuth("SUPER_ADMIN");

  const logger = rootLogger.child({ action: "createBlogArticle" });

  try {
    // Check if slug + locale combination already exists
    const existing = await prisma.blogArticle.findUnique({
      where: {
        locale_slug: {
          locale: data.locale,
          slug: data.slug,
        },
      },
    });

    if (existing) {
      return {
        success: false,
        code: "forbidden",
        message: "Blog article with this slug and locale already exists",
      };
    }

    const article = await prisma.blogArticle.create({
      data,
    });

    // Revalidate cache
    revalidateTag("blog-list");
    revalidateTag("blog-article");

    logger.info({ msg: "Blog article created", articleId: article.id });

    return {
      success: true,
      data: article,
    };
  } catch (error) {
    logger.error({
      msg: "Failed to create blog article",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      success: false,
      code: "internal_server_error",
      message: "Failed to create blog article",
    };
  }
}

/**
 * Update an existing blog article
 */
export async function updateBlogArticle(
  id: number,
  data: Partial<BlogArticleInput>,
): Promise<ServerActionResult<BlogArticle>> {
  await checkAdminAuth("SUPER_ADMIN");

  const logger = rootLogger.child({ action: "updateBlogArticle", articleId: id });

  try {
    // Check if article exists
    const existing = await prisma.blogArticle.findUnique({
      where: { id },
    });

    if (!existing) {
      return {
        success: false,
        code: "not_found",
        message: "Blog article not found",
      };
    }

    // If slug or locale is being changed, check for duplicates
    if (data.slug || data.locale) {
      const slug = data.slug || existing.slug;
      const locale = data.locale || existing.locale;

      const duplicate = await prisma.blogArticle.findFirst({
        where: {
          locale,
          slug,
          NOT: { id },
        },
      });

      if (duplicate) {
        return {
          success: false,
          code: "forbidden",
          message: "Another blog article with this slug and locale already exists",
        };
      }
    }

    const article = await prisma.blogArticle.update({
      where: { id },
      data,
    });

    // Revalidate cache
    revalidateTag("blog-list");
    revalidateTag("blog-article");

    logger.info({ msg: "Blog article updated", articleId: article.id });

    return {
      success: true,
      data: article,
    };
  } catch (error) {
    logger.error({
      msg: "Failed to update blog article",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      success: false,
      code: "internal_server_error",
      message: "Failed to update blog article",
    };
  }
}

/**
 * Delete a blog article
 */
export async function deleteBlogArticle(id: number): Promise<ServerActionResult<void>> {
  await checkAdminAuth("SUPER_ADMIN");

  const logger = rootLogger.child({ action: "deleteBlogArticle", articleId: id });

  try {
    await prisma.blogArticle.delete({
      where: { id },
    });

    // Revalidate cache
    revalidateTag("blog-list");
    revalidateTag("blog-article");

    logger.info({ msg: "Blog article deleted", articleId: id });

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    logger.error({
      msg: "Failed to delete blog article",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      success: false,
      code: "internal_server_error",
      message: "Failed to delete blog article",
    };
  }
}
