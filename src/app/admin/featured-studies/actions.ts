"use server";
import { prisma } from "@/lib/prisma";
import { Analyst } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { checkAdminAuth } from "../utils";
// Public action for fetching featured studies (no auth check needed)

export async function fetchPublicFeaturedStudies() {
  const featuredStudies = await prisma.featuredStudy.findMany({
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
          report: true,
          studySummary: true,
        },
      },
    },
    orderBy: {
      displayOrder: "asc",
    },
    take: 6,
  });

  return { data: featuredStudies };
}

// Get all featured studies
export async function fetchFeaturedStudies() {
  await checkAdminAuth();
  const featuredStudies = await prisma.featuredStudy.findMany({
    include: {
      analyst: true,
    },
    orderBy: { displayOrder: "asc" },
  });
  return { data: featuredStudies };
}

// Get all analysts with their featured status
export async function fetchAnalysts(page: number = 1, pageSize: number = 12) {
  await checkAdminAuth();

  const skip = (page - 1) * pageSize;
  const where = {
    studyUserChat: {
      token: {
        not: null,
      },
    },
  };

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
export async function toggleFeaturedStatus(analyst: Analyst) {
  await checkAdminAuth();

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
    throw new Error("Study user chat ID is required");
  }

  revalidatePath("/admin/featured-studies");
}

// Remove a study from featured list
export async function removeFeaturedStudy(id: number) {
  await checkAdminAuth();
  await prisma.featuredStudy.delete({
    where: { id },
  });
  revalidatePath("/admin/featured-studies");
}

// Update display order
export async function updateDisplayOrder(id: number, direction: "up" | "down") {
  await checkAdminAuth();

  // Get the current featured study
  const currentStudy = await prisma.featuredStudy.findUnique({
    where: { id },
  });

  if (!currentStudy) {
    throw new Error("Featured study not found");
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
    return { success: true };
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
}
