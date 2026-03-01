"use server";

import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { rootLogger } from "@/lib/logging";
import { ServerActionResult } from "@/lib/serverAction";
import { InterviewProjectWhereInput } from "@/prisma/models";
import { prisma } from "@/prisma/prisma";
import { searchProjects as searchProjectsFromMeili } from "@/search/lib/queries";
import { TokensLogResourceType } from "@/tokens/types";

export type InterviewProjectData = {
  id: number;
  token: string;
  brief: string;
  userId: number;
  userEmail: string;
  userName: string | null;
  humanSessionsCount: number;
  aiPersonaSessionsCount: number;
  totalTokens: number;
  createdAt: Date;
};

/**
 * 判断是否是 token（16位字母数字）
 */
function isToken(query: string): boolean {
  return /^[a-zA-Z0-9]{16}$/.test(query);
}

/**
 * 判断是否是 email
 */
function isEmail(query: string): boolean {
  return query.includes("@");
}

/**
 * 从 slug 提取 ID（格式：interview-123）
 */
function extractIdFromSlug(slug: string): number {
  const match = slug.match(/^interview-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

export async function fetchInterviewProjects(
  page: number = 1,
  pageSize: number = 10,
  searchQuery: string = "",
): Promise<ServerActionResult<InterviewProjectData[]>> {
  await checkAdminAuth([AdminPermission.MANAGE_INTERVIEWS]);

  const skip = (page - 1) * pageSize;
  let where: InterviewProjectWhereInput = {};
  let totalCount = 0;
  let orderedIds: number[] | null = null;
  let useDatabasePagination = true;

  // 三层搜索：token 精确匹配 → email 精确匹配 → 关键词走 MeiliSearch
  if (searchQuery) {
    const trimmedQuery = searchQuery.trim();

    if (isToken(trimmedQuery)) {
      where = { token: trimmedQuery };
    } else if (isEmail(trimmedQuery)) {
      where = { user: { email: trimmedQuery } };
    } else if (trimmedQuery) {
      try {
        const searchResults = await searchProjectsFromMeili({
          query: trimmedQuery,
          type: "interview",
          page,
          pageSize,
        });

        if (searchResults.hits.length === 0) {
          return {
            success: true,
            data: [],
            pagination: { page, pageSize, totalCount: 0, totalPages: 0 },
          };
        }

        orderedIds = searchResults.hits.map((hit) => extractIdFromSlug(hit.slug));
        where = { id: { in: orderedIds } };
        totalCount = searchResults.totalHits;
        useDatabasePagination = false;
      } catch (error) {
        rootLogger.error({
          msg: "MeiliSearch interview search failed",
          error: error instanceof Error ? error.message : String(error),
        });
        return {
          success: true,
          data: [],
          pagination: { page, pageSize, totalCount: 0, totalPages: 0 },
        };
      }
    }
  }

  const projects = await prisma.interviewProject.findMany({
    where,
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
      sessions: {
        select: {
          intervieweeUserId: true,
          intervieweePersonaId: true,
        },
      },
    },
    orderBy: useDatabasePagination ? { createdAt: "desc" } : undefined,
    skip: useDatabasePagination ? skip : undefined,
    take: useDatabasePagination ? pageSize : undefined,
  });

  if (useDatabasePagination) {
    totalCount = await prisma.interviewProject.count({ where });
  }

  // Get token consumption for each project
  const projectIds = projects.map((p) => p.id);
  const tokenConsumption = await prisma.tokensLog.groupBy({
    by: ["resourceId"],
    where: {
      resourceType: TokensLogResourceType.InterviewProject,
      resourceId: { in: projectIds },
      verb: "consume",
    },
    _sum: {
      value: true,
    },
  });

  const tokenMap = new Map<number, number>();
  tokenConsumption.forEach((tc) => {
    if (tc.resourceId && tc._sum.value) {
      tokenMap.set(tc.resourceId, Math.abs(tc._sum.value));
    }
  });

  // MeiliSearch 搜索时，按返回的顺序排序
  const sortedProjects = orderedIds
    ? (() => {
        const idToProject = new Map(projects.map((p) => [p.id, p]));
        return orderedIds
          .map((id) => idToProject.get(id))
          .filter((p): p is (typeof projects)[0] => p !== undefined);
      })()
    : projects;

  const interviewProjectsData: InterviewProjectData[] = sortedProjects.map((project) => {
    const humanSessionsCount = project.sessions.filter((s) => s.intervieweeUserId !== null).length;
    const aiPersonaSessionsCount = project.sessions.filter(
      (s) => s.intervieweePersonaId !== null,
    ).length;

    return {
      id: project.id,
      token: project.token,
      brief: project.brief,
      userId: project.userId,
      userEmail: project.user.email || "",
      userName: project.user.name,
      humanSessionsCount,
      aiPersonaSessionsCount,
      totalTokens: tokenMap.get(project.id) || 0,
      createdAt: project.createdAt,
    };
  });

  return {
    success: true,
    data: interviewProjectsData,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}
