"use server";
import { prisma } from "@/lib/prisma";
import { Analyst } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { checkAdminAuth } from "../utils";

// Get all featured studies
export async function fetchFeaturedStudies() {
  try {
    await checkAdminAuth();

    const featuredStudies = await prisma.featuredStudy.findMany({
      include: {
        analyst: true,
      },
      orderBy: { displayOrder: "asc" },
    });

    return { success: true, data: featuredStudies };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Get all analysts with their featured status
export async function fetchAnalysts(page: number = 1, pageSize: number = 12) {
  try {
    await checkAdminAuth();

    const skip = (page - 1) * pageSize;

    // Get all analysts with their featured status
    const analysts = await prisma.analyst.findMany({
      include: {
        featuredStudy: true,
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

    const totalCount = await prisma.analyst.count();

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
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Toggle featured status for a study
export async function toggleFeaturedStatus(analyst: Analyst) {
  try {
    await checkAdminAuth();

    if (!analyst.id) {
      throw new Error("Analyst ID is required");
    }

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
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Remove a study from featured list
export async function removeFeaturedStudy(id: number) {
  try {
    await checkAdminAuth();

    if (!id) {
      throw new Error("Featured study ID is required");
    }

    await prisma.featuredStudy.delete({
      where: { id },
    });

    revalidatePath("/admin/featured-studies");
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Update display order
export async function updateDisplayOrder(id: number, direction: "up" | "down") {
  try {
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
          direction === "up"
            ? { lt: currentStudy.displayOrder }
            : { gt: currentStudy.displayOrder },
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
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
