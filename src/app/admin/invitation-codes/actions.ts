"use server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

// Function to generate a random invitation code
function generateInvitationCode(length: number = 8): string {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length)
    .toUpperCase();
}

// Check if the user is authorized as an admin
async function checkAdminAuth() {
  const session = await getServerSession(authOptions);

  // Check if the user is authenticated
  if (!session) {
    throw new Error("Unauthorized");
  }

  // TODO: Add proper admin check here
  // This is a simple check based on email domain, but you should implement proper admin role checks
  if (!session.user?.email?.endsWith("@tezign.com")) {
    throw new Error("Forbidden");
  }

  return session;
}

// List all invitation codes
export async function getInvitationCodes() {
  try {
    await checkAdminAuth();

    const invitationCodes = await prisma.invitationCode.findMany({
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: invitationCodes };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Create a new invitation code
export async function createInvitationCode() {
  try {
    await checkAdminAuth();

    // Generate a new invitation code
    const code = generateInvitationCode();

    const invitationCode = await prisma.invitationCode.create({
      data: {
        code,
      },
    });

    revalidatePath("/admin/invitation-codes");
    return { success: true, data: invitationCode };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Delete an invitation code
export async function deleteInvitationCode(id: number) {
  try {
    await checkAdminAuth();

    if (!id) {
      throw new Error("Invitation code ID is required");
    }

    await prisma.invitationCode.delete({
      where: { id },
    });

    revalidatePath("/admin/invitation-codes");
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
