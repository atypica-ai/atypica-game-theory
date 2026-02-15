import { docs as faqDocs } from "@/app/(public)/(docs)/faq/docs-config";
import { docs as featureDocs } from "@/app/(public)/(docs)/features/docs-config";
import { docs as guideDocs } from "@/app/(public)/(docs)/guides/docs-config";
import { getRequestOrigin } from "@/lib/request/headers";
import { FeaturedItemExtra, FeaturedItemResourceType } from "@/prisma/client";
import { prismaRO } from "@/prisma/prisma";
import { MetadataRoute } from "next";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

// Cache featured reports for 1 day
const getFeaturedReports = unstable_cache(
  async (locale: Locale) => {
    const featuredItems = await prismaRO.featuredItem.findMany({
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
  async (locale: Locale) => {
    const featuredItems = await prismaRO.featuredItem.findMany({
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
    const articles = await prismaRO.blogArticle.findMany({
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
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/persona`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/interview`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/sage`,
      changeFrequency: "weekly",
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
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/solutions/product-managers`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/solutions/marketers`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/solutions/influencers`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/solutions/creators`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/solutions/consultants`,
      changeFrequency: "weekly",
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
    {
      url: `${siteOrigin}/faq`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/guides`,
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
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    const podcastRoutes: MetadataRoute.Sitemap = podcastEpisodes.map(({ url, updatedAt }) => ({
      url: `${siteOrigin}${url}`,
      lastModified: updatedAt,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    const blogRoutes: MetadataRoute.Sitemap = blogArticles.map(({ slug, lastModified }) => ({
      url: `${siteOrigin}/blog/${slug}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    // Generate feature, FAQ, and guide doc routes
    const featureRoutes: MetadataRoute.Sitemap = featureDocs.map(({ slug }) => ({
      url: `${siteOrigin}/features/${slug}`,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    const faqRoutes: MetadataRoute.Sitemap = faqDocs.map(({ slug }) => ({
      url: `${siteOrigin}/faq/${slug}`,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    const guideRoutes: MetadataRoute.Sitemap = guideDocs.map(({ slug }) => ({
      url: `${siteOrigin}/guides/${slug}`,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    return [
      ...staticRoutes,
      ...reportRoutes,
      ...podcastRoutes,
      ...blogRoutes,
      ...featureRoutes,
      ...faqRoutes,
      ...guideRoutes,
    ];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    // Return static routes if database query fails
    return staticRoutes;
  }
}
