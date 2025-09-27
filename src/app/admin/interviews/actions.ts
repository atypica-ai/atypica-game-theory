"use server";

import { checkAdminAuth } from "@/app/admin/actions";
import { AdminPermission } from "@/app/admin/types";
import { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
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

export async function fetchInterviewProjects(
  page: number = 1,
  pageSize: number = 10,
  searchQuery: string = "",
): Promise<ServerActionResult<InterviewProjectData[]>> {
  // Ensure only admins with proper permissions can access this data
  await checkAdminAuth([AdminPermission.MANAGE_INTERVIEWS]);

  // Calculate pagination
  const skip = (page - 1) * pageSize;

  // Build where condition for search
  const whereCondition = searchQuery
    ? {
        OR: [
          { brief: { contains: searchQuery } },
          { token: searchQuery },
          { user: { email: { contains: searchQuery } } },
        ],
      }
    : {};

  // Get projects with user info and session counts
  const projects = await prisma.interviewProject.findMany({
    where: whereCondition,
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
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take: pageSize,
  });

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

  // Create a map for quick lookup
  const tokenMap = new Map<number, number>();
  tokenConsumption.forEach((tc) => {
    if (tc.resourceId && tc._sum.value) {
      // TokensLog中consume类型的value是负数，所以需要取绝对值
      tokenMap.set(tc.resourceId, Math.abs(tc._sum.value));
    }
  });

  // Transform the data
  const interviewProjectsData: InterviewProjectData[] = projects.map((project) => {
    // Count human vs AI persona sessions
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

  // Get total count for pagination
  const totalCount = await prisma.interviewProject.count({
    where: whereCondition,
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
