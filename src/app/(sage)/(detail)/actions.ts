"use server";
import { withAuth } from "@/lib/request/withAuth";
import type { ServerActionResult } from "@/lib/serverAction";
import { prisma } from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

/**
 * Update sage avatar
 */
export async function updateSageAvatar(
  sageId: number,
  avatarUrl: string,
): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    // Check ownership and get token for revalidation
    const sage = await prisma.sage.findUnique({
      where: { id: sageId },
      select: {
        userId: true,
        token: true,
      },
    });

    if (!sage) {
      return {
        success: false,
        message: "Sage not found",
        code: "not_found",
      };
    }

    if (sage.userId !== user.id) {
      return {
        success: false,
        message: "Not authorized",
        code: "forbidden",
      };
    }

    await prisma.sage.update({
      where: { id: sageId },
      data: {
        avatar: { url: avatarUrl },
      },
    });

    revalidatePath(`/sage/${sage.token}`);
    revalidatePath(`/sage/profile/${sage.token}`);

    return { success: true, data: undefined };
  });
}
