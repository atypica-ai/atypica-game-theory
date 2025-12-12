"use server";
import { proxiedImageCdnUrl } from "@/app/(system)/cdn/lib";
import { ServerActionResult } from "@/lib/serverAction";
import { Analyst, AnalystKind, AnalystReportExtra, FeaturedStudy, UserChat } from "@/prisma/client";
import { prismaRO } from "@/prisma/prisma";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { unstable_cache } from "next/cache";

type TFeaturedStudyResult = Pick<FeaturedStudy, "id" | "displayOrder"> & {
  analyst: Pick<Analyst, "id" | "role" | "topic" | "studySummary" | "kind">;
  studyUserChat: Pick<UserChat, "id" | "token" | "title">;
};

type TReportInfo = {
  token: string;
  coverUrl: string | null;
};

// Internal implementation of fetchPublicFeaturedStudies
async function _fetchPublicFeaturedStudiesImpl({
  locale,
  kind,
  limit,
  random,
}: {
  locale: Locale;
  kind?: AnalystKind | "all";
  limit?: number;
  random?: boolean;
}): Promise<
  (Omit<TFeaturedStudyResult, "analyst"> & {
    analyst: Pick<Analyst, "id" | "role" | "topic" | "studySummary"> & {
      kind: AnalystKind;
      latestReport: TReportInfo | null;
    };
  })[]
> {
  locale = locale || (await getLocale());
  let featuredStudies: TFeaturedStudyResult[];

  const selectClause = {
    id: true,
    displayOrder: true,
    studyUserChat: {
      select: {
        id: true,
        token: true,
        title: true,
      },
    },
    analyst: {
      select: {
        id: true,
        kind: true,
        role: true,
        topic: true,
        studySummary: true,
      },
    },
  };

  if (random && limit) {
    let result: { id: number }[];
    if (kind && kind !== "all") {
      result = (await prismaRO.$queryRaw`
        SELECT "FeaturedStudy".id
        FROM "FeaturedStudy"
        INNER JOIN "Analyst" ON "Analyst".id = "FeaturedStudy"."analystId"
        WHERE "Analyst".locale = ${locale} AND "Analyst".kind = ${kind}
        ORDER BY RANDOM()
        LIMIT ${limit}
      `) as { id: number }[];
    } else {
      result = (await prismaRO.$queryRaw`
        SELECT "FeaturedStudy".id
        FROM "FeaturedStudy"
        INNER JOIN "Analyst" ON "Analyst".id = "FeaturedStudy"."analystId"
        WHERE "Analyst".locale = ${locale}
        ORDER BY RANDOM()
        LIMIT ${limit}
      `) as { id: number }[];
    }
    const studyIds = result.map((item) => item.id);

    if (studyIds.length > 0) {
      const studies = await prismaRO.featuredStudy.findMany({
        where: { id: { in: studyIds } },
        select: selectClause,
      });
      // Re-sort to maintain random order from the raw query
      const studyMap = new Map(studies.map((s) => [s.id, s]));
      featuredStudies = studyIds
        .map((id) => studyMap.get(id))
        .filter((s): s is NonNullable<typeof s> => s != null);
    } else {
      featuredStudies = [];
    }
  } else {
    const where =
      kind && kind !== "all"
        ? { analyst: { locale: locale, kind: kind } }
        : { analyst: { locale: locale } };

    featuredStudies = await prismaRO.featuredStudy.findMany({
      where,
      select: selectClause,
      // orderBy: { displayOrder: "asc" },
      orderBy: {
        analyst: { id: "desc" },
        // displayOrder: "asc",
      },
      take: limit,
    });
  }

  if (!featuredStudies || featuredStudies.length === 0) {
    return [];
  }

  const analystIds = featuredStudies.map((study) => study.analyst.id);

  const latestReports = await prismaRO.analystReport.findMany({
    where: { analystId: { in: analystIds } },
    distinct: ["analystId"],
    orderBy: [{ analystId: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      analystId: true,
      token: true,
      extra: true,
    },
  });

  const reportsMap = Object.fromEntries(
    await Promise.all(
      latestReports.map(async (report) => {
        const { analystId, token, extra } = report;
        const objectUrl = (extra as AnalystReportExtra).coverObjectUrl;
        if (objectUrl) {
          const coverUrl = proxiedImageCdnUrl({ objectUrl });
          return [analystId, { token, coverUrl }] as [number, TReportInfo];
        } else {
          return [analystId, { token, coverUrl: null }] as [number, TReportInfo];
        }
        // if (extra && typeof extra === "object" && "coverObjectUrl" in extra) {
        //   const result = await reportCoverObjectUrlToHttpUrl(report);
        //   if (result) {
        //     try {
        //       const coverUrl = result.signedCoverObjectUrl;
        //       return [analystId, { token, coverUrl }] as [number, TReportInfo];
        //     } catch {}
        //   }
        // }
        return [analystId, { token, coverUrl: null }] as [number, TReportInfo];
      }),
    ),
  );

  const data = featuredStudies.map((study) => {
    return {
      ...study,
      analyst: {
        ...study.analyst,
        kind: study.analyst.kind ? (study.analyst.kind as AnalystKind) : AnalystKind.misc,
        latestReport: reportsMap[study.analyst.id.toString()] || null,
      },
    };
  });

  return data;
}

/**
 * Public action for fetching featured studies (no auth check needed)
 *
 * unstable_cache 原理：
 * - 函数参数会自动成为缓存key的一部分
 * - 实际缓存key: ["public-featured-studies", locale, kind, limit, random]
 * - 不同的参数组合有独立的缓存项
 * - 缓存时间: 1天 (86400秒)
 *
 * 缓存清除：
 * 在需要清除缓存时使用: revalidateTag("public-featured-studies")
 */
const getCachedFeaturedStudies = unstable_cache(
  async (locale: Locale, kind?: AnalystKind | "all", limit?: number, random?: boolean) => {
    return _fetchPublicFeaturedStudiesImpl({
      locale,
      kind,
      limit,
      random,
    });
  },
  ["public-featured-studies"],
  {
    revalidate: 86400, // 1 day cache
    tags: ["public-featured-studies"],
  },
);

export async function fetchPublicFeaturedStudies({
  locale,
  kind,
  page = 1,
  pageSize = 12,
  random,
}: {
  locale: Locale;
  kind?: AnalystKind | "all";
  page?: number;
  pageSize?: number;
  random?: boolean;
}): Promise<ServerActionResult<Awaited<ReturnType<typeof _fetchPublicFeaturedStudiesImpl>>>> {
  const localeResolved = locale || (await getLocale());
  const allData = await getCachedFeaturedStudies(localeResolved, kind, undefined, random);

  // Apply pagination
  const totalCount = allData.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const skip = (page - 1) * pageSize;
  const paginatedData = allData.slice(skip, skip + pageSize);

  return {
    success: true,
    data: paginatedData,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
    },
  };
}
