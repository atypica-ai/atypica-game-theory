import { getRequestOrigin } from "@/lib/request/headers";
import { FeaturedItemExtra, FeaturedItemResourceType } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { MetadataRoute } from "next";
import { getLocale } from "next-intl/server";
import { unstable_cache } from "next/cache";
import { getSubstackPosts } from "./blog/lib";

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
      take: 100,
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
      take: 100,
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
  },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteOrigin = await getRequestOrigin();
  const locale = await getLocale();

  // Static routes that should be indexed
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteOrigin,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteOrigin}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteOrigin}/featured-studies`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/insight-radio`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/newstudy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/persona`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteOrigin}/interview`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // {
    //   url: `${siteOrigin}/status`,
    //   lastModified: new Date(),
    //   changeFrequency: "daily",
    //   priority: 0.5,
    // },
    {
      url: `${siteOrigin}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteOrigin}/changelog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${siteOrigin}/persona-simulation`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteOrigin}/auth/signin`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteOrigin}/auth/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteOrigin}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  try {
    const [reportResults, podcastEpisodes, blogPosts] = await Promise.all([
      getFeaturedReports(locale),
      getFeaturedPodcastEpisodes(locale),
      getSubstackPosts(),
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

    const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
      url: `${siteOrigin}/blog/${post.slug}`,
      lastModified: post.pubDate ? new Date(post.pubDate) : new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    return [...staticRoutes, ...reportRoutes, ...podcastRoutes, ...blogRoutes];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    // Return static routes if database query fails
    return staticRoutes;
  }
}
