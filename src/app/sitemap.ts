import { getRequestOrigin } from "@/lib/request/headers";
import { FeaturedItemExtra, FeaturedItemResourceType } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { MetadataRoute } from "next";
import { getLocale } from "next-intl/server";
import { unstable_cache } from "next/cache";
import { docs } from "@/app/(features)/features/docs-config";

export const dynamic = "force-dynamic";

// Cache featured reports for 1 day
const getFeaturedReports = unstable_cache(
  async (locale: string) => {
    const featuredItems = await prisma.featuredItem.findMany({
      where: {
        resourceType: FeaturedItemResourceType.AnalystReport,
        locale,
      },
      select: {
        extra: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

    return featuredItems.map((item) => {
      const extra = item.extra as FeaturedItemExtra;
      // Extract token from url: /artifacts/report/{token}/share
      const urlMatch = extra.url?.match(/\/artifacts\/report\/([^\/]+)\/share/);
      const token = urlMatch?.[1] || "";
      return {
        token,
        url: extra.url || "",
        updatedAt: item.createdAt,
      };
    });
  },
  ["sitemap-featured-reports"],
  {
    revalidate: 86400, // 1 day cache
    tags: ["sitemap-featured-reports"],
  },
);

// Cache featured podcast episodes for 1 day
const getFeaturedPodcastEpisodes = unstable_cache(
  async (locale: string) => {
    const featuredItems = await prisma.featuredItem.findMany({
      where: {
        resourceType: FeaturedItemResourceType.AnalystPodcast,
        locale,
      },
      select: {
        extra: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
    });

    return featuredItems.map((item) => {
      const extra = item.extra as FeaturedItemExtra;
      // Extract token from url: /artifacts/podcast/{token}/share
      const urlMatch = extra.url?.match(/\/artifacts\/podcast\/([^\/]+)\/share/);
      const token = urlMatch?.[1] || "";
      return {
        token,
        url: extra.url || "",
        updatedAt: item.createdAt,
      };
    });
  },
  ["sitemap-featured-podcasts"],
  {
    revalidate: 86400, // 1 day cache
    tags: ["sitemap-featured-podcasts"],
  },
);

// Cache blog articles for 1 day
const getBlogArticles = unstable_cache(
  async () => {
    const articles = await prisma.blogArticle.findMany({
      where: {
        publishedAt: {
          not: null,
        },
      },
      select: {
        slug: true,
        publishedAt: true,
        updatedAt: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
      distinct: ["slug"], // Get unique slugs (handles both en-US and zh-CN)
    });

    return articles.map((article) => ({
      slug: article.slug,
      lastModified: article.publishedAt ?? article.updatedAt,
    }));
  },
  ["sitemap-blog-articles"],
  {
    revalidate: 86400, // 1 day cache
  },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteOrigin = await getRequestOrigin();
  const locale = await getLocale();

  // Static routes that should be indexed
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteOrigin,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteOrigin}/pricing`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteOrigin}/featured-studies`,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/insight-radio`,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/newstudy`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/persona`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/interview`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/sage`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/about`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteOrigin}/changelog`,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${siteOrigin}/persona-simulation`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteOrigin}/affiliate`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteOrigin}/enterprise`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/privacy`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${siteOrigin}/terms`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${siteOrigin}/glossary`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteOrigin}/docs/api`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteOrigin}/solutions/startup-owners`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/solutions/product-managers`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/solutions/marketers`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/solutions/influencers`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/solutions/creators`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/solutions/consultants`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/auth/signin`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteOrigin}/auth/signup`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteOrigin}/blog`,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/features`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  try {
    const [reportResults, podcastEpisodes, blogArticles] = await Promise.all([
      getFeaturedReports(locale),
      getFeaturedPodcastEpisodes(locale),
      getBlogArticles(),
    ]);

    const reportRoutes: MetadataRoute.Sitemap = reportResults.map(({ url, updatedAt }) => ({
      url: `${siteOrigin}${url}`,
      lastModified: updatedAt,
      changeFrequency: "daily",
      priority: 0.6,
    }));

    const podcastRoutes: MetadataRoute.Sitemap = podcastEpisodes.map(({ url, updatedAt }) => ({
      url: `${siteOrigin}${url}`,
      lastModified: updatedAt,
      changeFrequency: "daily",
      priority: 0.6,
    }));

    const blogRoutes: MetadataRoute.Sitemap = blogArticles.map(({ slug, lastModified }) => ({
      url: `${siteOrigin}/blog/${slug}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    // Generate feature doc routes
    const featureRoutes: MetadataRoute.Sitemap = docs.map(({ slug }) => ({
      url: `${siteOrigin}/features/${slug}`,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    return [...staticRoutes, ...reportRoutes, ...podcastRoutes, ...blogRoutes, ...featureRoutes];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    // Return static routes if database query fails
    return staticRoutes;
  }
}
