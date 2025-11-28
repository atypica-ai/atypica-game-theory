import { getRequestOrigin } from "@/lib/request/headers";
import { prisma } from "@/prisma/prisma";
import { MetadataRoute } from "next";
import { getLocale } from "next-intl/server";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

// Cache featured studies for 1 day
const getFeaturedStudies = unstable_cache(
  async (locale: string) => {
    const result = (await prisma.$queryRaw`
      SELECT "UserChat".token, "Analyst"."updatedAt"
      FROM "FeaturedStudy"
      INNER JOIN "Analyst" ON "Analyst".id = "FeaturedStudy"."analystId"
      INNER JOIN "UserChat" ON "UserChat".id = "FeaturedStudy"."studyUserChatId"
      WHERE "Analyst".locale = ${locale}
      ORDER BY RANDOM()
      LIMIT 6
    `) as { token: string; updatedAt: Date }[];
    return result;
  },
  ["sitemap-featured-studies"],
  {
    revalidate: 86400, // 1 day cache
  },
);

// Cache featured radio episodes for 1 day
const getFeaturedPodcastEpisodes = unstable_cache(
  async (locale: string) => {
    const podcasts = await prisma.analystPodcast.findMany({
      where: {
        generatedAt: { not: null },
        analyst: {
          locale,
          featuredStudy: { isNot: null },
        },
      },
      select: {
        token: true,
        generatedAt: true,
      },
      orderBy: {
        generatedAt: "desc",
      },
      take: 10,
    });
    return podcasts;
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
  ];

  try {
    // Fetch featured studies with cache
    const studyResults = await getFeaturedStudies(locale);
    const studyRoutes: MetadataRoute.Sitemap = studyResults.map(({ token, updatedAt }) => ({
      url: `${siteOrigin}/study/${token}/share?replay=1`,
      lastModified: updatedAt,
      changeFrequency: "daily",
      priority: 0.6,
    }));

    // Fetch featured podcast episodes with cache
    const podcastEpisodes = await getFeaturedPodcastEpisodes(locale);
    const podcastRoutes: MetadataRoute.Sitemap = podcastEpisodes.map((podcast) => ({
      url: `${siteOrigin}/artifacts/podcast/${podcast.token}/share`,
      lastModified: podcast.generatedAt!,
      changeFrequency: "daily",
      priority: 0.6,
    }));

    return [...staticRoutes, ...studyRoutes, ...podcastRoutes];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    // Return static routes if database query fails
    return staticRoutes;
  }
}
