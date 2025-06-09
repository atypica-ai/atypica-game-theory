"use server";
import { AnalystKind } from "@/app/(public)/featured-studies/data";
import { checkAdminAuth } from "@/app/admin/actions";
import { ServerActionResult } from "@/lib/serverAction";
import { Analyst, FeaturedStudy, User, UserChat } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { AdminPermission } from "../types";
// Public action for fetching featured studies (no auth check needed)

export async function fetchPublicFeaturedStudies({
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
  ServerActionResult<
    (Pick<FeaturedStudy, "id" | "displayOrder"> & {
      analyst: Pick<Analyst, "id" | "role" | "topic" | "studySummary"> & {
        kind: AnalystKind | null;
      };
      studyUserChat: Pick<UserChat, "id" | "token">;
    })[]
  >
> {
  locale = locale || (await getLocale());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let where: any =
    kind && kind !== "all"
      ? {
          analyst: { locale: locale, kind: kind },
        }
      : {
          analyst: { locale: locale },
        };
  if (random && limit) {
    // 如果有 random，一定要有 limit，并且忽略 category
    const result = (await prisma.$queryRaw`
      SELECT "FeaturedStudy".id
      FROM "FeaturedStudy"
      INNER JOIN "Analyst" ON "Analyst".id = "FeaturedStudy"."analystId"
      WHERE "Analyst".locale = ${locale}
      ORDER BY RANDOM()
      LIMIT ${limit}
    `) as {
      id: number;
    }[];
    where = {
      id: {
        in: result.map((item) => item.id),
      },
    };
  }

  const featuredStudies = await prisma.featuredStudy.findMany({
    where,
    select: {
      id: true,
      displayOrder: true,
      studyUserChat: {
        select: {
          id: true,
          token: true,
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
    },
    orderBy: {
      displayOrder: "asc",
    },
    take: limit,
  });

  return {
    success: true,
    data: featuredStudies.map((study) => ({
      ...study,
      analyst: {
        ...study.analyst,
        kind: study.analyst.kind as AnalystKind | null,
      },
    })),
  };
}

// Get all featured studies
export async function fetchFeaturedStudies(): Promise<
  ServerActionResult<
    (Pick<FeaturedStudy, "id" | "displayOrder"> & {
      analyst: Omit<Analyst, "kind"> & {
        kind: AnalystKind | null;
      };
      studyUserChat: Pick<UserChat, "id" | "token">;
    })[]
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);
  const featuredStudies = await prisma.featuredStudy.findMany({
    select: {
      id: true,
      displayOrder: true,
      analyst: true,
      studyUserChat: {
        select: {
          id: true,
          token: true,
        },
      },
    },
    orderBy: { displayOrder: "asc" },
  });
  return {
    success: true,
    data: featuredStudies.map((study) => ({
      ...study,
      analyst: {
        ...study.analyst,
        kind: study.analyst.kind as AnalystKind | null,
      },
    })),
  };
}

// Get all analysts with their featured status
export async function fetchAnalysts(
  page: number = 1,
  search?: string,
  pageSize: number = 12,
  kind?: AnalystKind | "all",
  featuredOnly?: boolean,
): Promise<
  ServerActionResult<
    (Analyst & {
      user: Pick<User, "email"> | null;
      featuredStudy: FeaturedStudy | null;
      studyUserChat: Pick<UserChat, "token"> | null;
    })[]
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const skip = (page - 1) * pageSize;

  // Build where clause
  const where: {
    topic: { not: string };
    OR?: Array<{
      topic?: { contains: string };
      user?: { email: { contains: string } };
    }>;
    kind?: AnalystKind;
    featuredStudy?: { isNot: null };
  } = {
    topic: { not: "" },
  };

  // Add search filter
  if (search) {
    where.OR = [
      { topic: { contains: search } },
      {
        user: {
          email: { contains: search },
        },
      },
    ];
  }

  // Add kind filter
  if (kind && kind !== "all") {
    where.kind = kind;
  }

  // Add featured filter
  if (featuredOnly) {
    where.featuredStudy = {
      isNot: null,
    };
  }

  // Get all analysts with their featured status
  const analysts = await prisma.analyst.findMany({
    where,
    include: {
      featuredStudy: true,
      studyUserChat: {
        select: {
          token: true,
        },
      },
      user: {
        select: {
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: pageSize,
  });

  const totalCount = await prisma.analyst.count({ where });

  return {
    success: true,
    data: analysts,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

// Toggle featured status for a study
export async function toggleFeaturedStatus(analyst: Analyst): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  // Check if the analyst is already featured
  const existingFeatured = await prisma.featuredStudy.findFirst({
    where: { analystId: analyst.id },
  });

  if (existingFeatured) {
    // If already featured, remove it
    await prisma.featuredStudy.delete({
      where: { id: existingFeatured.id },
    });
  } else if (analyst.studyUserChatId) {
    // If not featured, add it
    // Get the highest current display order
    const highestOrder = await prisma.featuredStudy.findFirst({
      orderBy: { displayOrder: "desc" },
    });

    const nextOrder = (highestOrder?.displayOrder || 0) + 1;

    await prisma.featuredStudy.create({
      data: {
        analystId: analyst.id,
        studyUserChatId: analyst.studyUserChatId,
        displayOrder: nextOrder,
      },
    });
  } else {
    return {
      success: false,
      message: "Study user chat ID is required",
    };
  }

  revalidatePath("/admin/featured-studies");
  return {
    success: true,
    data: undefined,
  };
}

// Remove a study from featured list
export async function removeFeaturedStudy(id: number): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);
  await prisma.featuredStudy.delete({
    where: { id },
  });
  revalidatePath("/admin/featured-studies");
  return {
    success: true,
    data: undefined,
  };
}

export async function updateDisplayOrder(
  id: number,
  direction: "up" | "down",
): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  // Get the current featured study
  const currentStudy = await prisma.featuredStudy.findUnique({
    where: { id },
  });

  if (!currentStudy) {
    return {
      success: false,
      message: "Featured study not found",
    };
  }

  // Find adjacent study
  const adjacentStudy = await prisma.featuredStudy.findFirst({
    where: {
      displayOrder:
        direction === "up" ? { lt: currentStudy.displayOrder } : { gt: currentStudy.displayOrder },
    },
    orderBy: {
      displayOrder: direction === "up" ? "desc" : "asc",
    },
  });

  if (!adjacentStudy) {
    // No study to swap with, already at the extreme
    return { success: true, data: undefined };
  }

  // Swap display orders
  await prisma.$transaction(async (tx) => {
    await tx.featuredStudy.update({
      where: { id: currentStudy.id },
      data: { displayOrder: adjacentStudy.displayOrder },
    });
    await tx.featuredStudy.update({
      where: { id: adjacentStudy.id },
      data: { displayOrder: currentStudy.displayOrder },
    });
  });

  revalidatePath("/admin/featured-studies");
  return {
    success: true,
    data: undefined,
  };
}

export async function updatePositionDirect(
  id: number,
  newPosition: number,
): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  // Ensure newPosition is a positive integer
  const position = Math.max(1, Math.floor(newPosition));

  // Get the current study
  const currentStudy = await prisma.featuredStudy.findUnique({
    where: { id },
  });

  if (!currentStudy) {
    return {
      success: false,
      message: "Featured study not found",
    };
  }

  // Get all featured studies
  const allStudies = await prisma.featuredStudy.findMany({
    orderBy: { displayOrder: "asc" },
  });

  // If position is beyond the end, set it to the last position
  const maxPosition = allStudies.length;
  const targetPosition = Math.min(position, maxPosition);

  // If the current position is the same as the target, no need to update
  if (currentStudy.displayOrder === targetPosition) {
    return { success: true, data: undefined };
  }

  // Update all affected studies in a transaction
  if (currentStudy.displayOrder > targetPosition) {
    // Moving up: increment studies between target and current
    await prisma.$transaction(async (tx) => {
      // Move studies between target and current position down by 1
      await tx.featuredStudy.updateMany({
        where: {
          displayOrder: {
            gte: targetPosition,
            lt: currentStudy.displayOrder,
          },
        },
        data: {
          displayOrder: { increment: 1 },
        },
      });
      // Set the current study to the target position
      await tx.featuredStudy.update({
        where: { id },
        data: { displayOrder: targetPosition },
      });
    });
  } else {
    // Moving down: decrement studies between current and target
    await prisma.$transaction(async (tx) => {
      // Move studies between current position and target down by 1
      await tx.featuredStudy.updateMany({
        where: {
          displayOrder: {
            gt: currentStudy.displayOrder,
            lte: targetPosition,
          },
        },
        data: {
          displayOrder: { decrement: 1 },
        },
      });
      // Set the current study to the target position
      await tx.featuredStudy.update({
        where: { id },
        data: { displayOrder: targetPosition },
      });
    });
  }

  revalidatePath("/admin/featured-studies");
  return {
    success: true,
    data: undefined,
  };
}
