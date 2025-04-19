"use server";
import { FeaturedStudyCategory } from "@/app/featured-studies/data";
import { UserChat } from "@/app/study/actions";
import { StudyUserChat } from "@/data/UserChat";
import { prisma } from "@/lib/prisma";
import { ServerActionResult } from "@/lib/serverAction";
import { Analyst, FeaturedStudy, User, UserAnalyst } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { AdminPermission, checkAdminAuth } from "../utils";
// Public action for fetching featured studies (no auth check needed)

export async function fetchPublicFeaturedStudies({
  category,
  limit,
}: {
  category?: string;
  limit?: number;
}): Promise<
  ServerActionResult<
    (FeaturedStudy & {
      analyst: Pick<Analyst, "id" | "role" | "topic" | "studySummary">;
      studyUserChat: Pick<StudyUserChat, "id" | "token">;
      category: FeaturedStudyCategory | null;
    })[]
  >
> {
  const where = category && category !== "all" ? { category: category } : undefined;

  const featuredStudies = await prisma.featuredStudy.findMany({
    where,
    include: {
      studyUserChat: {
        select: {
          id: true,
          token: true,
        },
      },
      analyst: {
        select: {
          id: true,
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
      category: study.category as FeaturedStudyCategory | null,
    })),
  };
}

// Get all featured studies
export async function fetchFeaturedStudies(): Promise<
  ServerActionResult<
    (FeaturedStudy & { analyst: Analyst; studyUserChat: Pick<StudyUserChat, "id" | "token"> })[]
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);
  const featuredStudies = await prisma.featuredStudy.findMany({
    include: {
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
    data: featuredStudies,
  };
}

// Get all analysts with their featured status
export async function fetchAnalysts(
  page: number = 1,
  search?: string,
  pageSize: number = 12,
): Promise<
  ServerActionResult<
    (Analyst & {
      userAnalysts: (UserAnalyst & {
        user: Pick<User, "email">;
      })[];
      featuredStudy: FeaturedStudy | null;
      studyUserChat: Pick<UserChat, "token"> | null;
    })[]
  >
> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  const skip = (page - 1) * pageSize;
  const where = search
    ? {
        OR: [
          { topic: { contains: search } },
          {
            userAnalysts: {
              some: {
                user: { email: { contains: search } },
              },
            },
          },
        ],
      }
    : undefined;

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
      userAnalysts: {
        include: {
          user: {
            select: {
              email: true,
            },
          },
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
  await prisma.$transaction([
    prisma.featuredStudy.update({
      where: { id: currentStudy.id },
      data: { displayOrder: adjacentStudy.displayOrder },
    }),
    prisma.featuredStudy.update({
      where: { id: adjacentStudy.id },
      data: { displayOrder: currentStudy.displayOrder },
    }),
  ]);

  revalidatePath("/admin/featured-studies");
  return {
    success: true,
    data: undefined,
  };
}

export async function updateCategory(
  id: number,
  category: FeaturedStudyCategory,
): Promise<ServerActionResult<void>> {
  await checkAdminAuth([AdminPermission.MANAGE_STUDIES]);

  // Sanitize the category string
  const sanitizedCategory = category.trim() || "general";

  await prisma.featuredStudy.update({
    where: { id },
    data: { category: sanitizedCategory },
  });

  revalidatePath("/admin/featured-studies");
  revalidatePath("/featured-studies");
  revalidatePath("/"); // Revalidate home page as well

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
    await prisma.$transaction([
      // Move studies between target and current position down by 1
      prisma.featuredStudy.updateMany({
        where: {
          displayOrder: {
            gte: targetPosition,
            lt: currentStudy.displayOrder,
          },
        },
        data: {
          displayOrder: { increment: 1 },
        },
      }),
      // Set the current study to the target position
      prisma.featuredStudy.update({
        where: { id },
        data: { displayOrder: targetPosition },
      }),
    ]);
  } else {
    // Moving down: decrement studies between current and target
    await prisma.$transaction([
      // Move studies between current position and target down by 1
      prisma.featuredStudy.updateMany({
        where: {
          displayOrder: {
            gt: currentStudy.displayOrder,
            lte: targetPosition,
          },
        },
        data: {
          displayOrder: { decrement: 1 },
        },
      }),
      // Set the current study to the target position
      prisma.featuredStudy.update({
        where: { id },
        data: { displayOrder: targetPosition },
      }),
    ]);
  }

  revalidatePath("/admin/featured-studies");
  return {
    success: true,
    data: undefined,
  };
}
