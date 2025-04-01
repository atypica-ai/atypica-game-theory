"use server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { checkAdminAuth, isAdminUser } from "../utils";

export async function checkTezignAuth() {
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

  if (!isAdminUser(session.user.email)) {
    throw new Error("Forbidden");
  }

  return session;
}

// Function to generate a random invitation code
function generateInvitationCode(length: number = 8): string {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length)
    .toUpperCase();
}

// List invitation codes based on user role
export async function getInvitationCodes() {
  try {
    const session = await checkTezignAuth();
    const userEmail = session.user?.email;

    if (!userEmail) {
      throw new Error("User email not available");
    }

    // Check if user is admin to determine visibility
    const isAdmin = await isAdminUser(userEmail);

    const invitationCodes = await prisma.invitationCode.findMany({
      where: isAdmin ? {} : { createdBy: userEmail },
      orderBy: { createdAt: "desc" },
    });

    // Add isAdmin flag to the response for UI to use
    return {
      success: true,
      data: invitationCodes,
      isAdmin,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Create a new invitation code
export async function createInvitationCode() {
  try {
    const session = await checkTezignAuth();

    // Get the email of the current user
    const creatorEmail = session.user?.email;

    if (!creatorEmail) {
      throw new Error("User email not available");
    }

    // Check if user already has 5 invitation codes
    const existingCodeCount = await prisma.invitationCode.count({
      where: {
        createdBy: creatorEmail,
      },
    });

    if (existingCodeCount >= 5) {
      throw new Error("You have reached the maximum limit of 5 invitation codes");
    }

    // Generate a new invitation code
    const code = generateInvitationCode();

    const invitationCode = await prisma.invitationCode.create({
      data: {
        code,
        createdBy: creatorEmail,
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
    const session = await checkAdminAuth();
    const userEmail = session.user?.email;

    if (!userEmail) {
      throw new Error("User email not available");
    }

    if (!id) {
      throw new Error("Invitation code ID is required");
    }

    // Check if the code exists
    const invitationCode = await prisma.invitationCode.findUnique({
      where: { id },
    });

    if (!invitationCode) {
      throw new Error("Invitation code not found");
    }

    // Determine if the user is an admin
    const isAdmin = await isAdminUser(userEmail);

    // Check permissions
    if (!isAdmin && invitationCode.createdBy !== userEmail) {
      throw new Error("You can only delete your own invitation codes");
    }

    // Only admins can delete codes, only unused codes can be deleted
    if (!isAdmin || invitationCode.usedBy) {
      throw new Error("Only administrators can delete unused invitation codes");
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
