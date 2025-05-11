"use server";
import { ServerActionResult } from "@/lib/serverAction";
import { InvitationCode } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { AdminPermission, checkTezignAuth, hasPermission } from "../utils";

// Function to generate a random invitation code
function generateInvitationCode(length: number = 8): string {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length)
    .toUpperCase();
}

// List invitation codes based on user role
export async function fetchInvitationCodes(
  page: number = 1,
  pageSize: number = 10,
): Promise<ServerActionResult<InvitationCode[]> & { isAdmin?: boolean }> {
  const user = await checkTezignAuth();
  const isAdmin = await hasPermission(user.email, AdminPermission.MANAGE_INVITATION_CODES);

  const skip = (page - 1) * pageSize;
  const where = isAdmin ? undefined : { createdBy: user.email };

  const invitationCodes = await prisma.invitationCode.findMany({
    where: where,
    orderBy: { createdAt: "desc" },
    skip,
    take: pageSize,
  });

  const totalCount = await prisma.invitationCode.count({ where });

  // Add isAdmin flag to the response for UI to use
  return {
    success: true,
    isAdmin,
    data: invitationCodes,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

// Create a new invitation code
export async function createInvitationCode(): Promise<ServerActionResult<InvitationCode>> {
  const user = await checkTezignAuth();
  // Check if user has MANAGE_INVITATION_CODES permission
  const isAdmin = await hasPermission(user.email, AdminPermission.MANAGE_INVITATION_CODES);

  // Check if user already has 5 invitation codes
  const existingCodeCount = await prisma.invitationCode.count({
    where: {
      createdBy: user.email,
    },
  });

  if (!isAdmin && existingCodeCount >= 5) {
    return {
      success: false,
      message: "You have reached the maximum limit of 5 invitation codes",
    };
  }

  // Generate a new invitation code
  const code = generateInvitationCode();

  const invitationCode = await prisma.invitationCode.create({
    data: {
      code,
      createdBy: user.email,
    },
  });

  revalidatePath("/admin/invitation-codes");

  return {
    success: true,
    data: invitationCode,
  };
}

// Delete an invitation code
export async function deleteInvitationCode(id: number): Promise<ServerActionResult<void>> {
  const user = await checkTezignAuth();

  // Check if the code exists
  const invitationCode = await prisma.invitationCode.findUnique({
    where: { id },
  });

  if (!invitationCode) {
    return {
      success: false,
      message: "Invitation code not found",
    };
  }

  const isAdmin = await hasPermission(user.email, AdminPermission.MANAGE_INVITATION_CODES);

  if (!isAdmin && invitationCode.createdBy !== user.email) {
    return {
      success: false,
      message: "You can only delete your own invitation codes",
    };
  }

  if (!isAdmin || invitationCode.usedBy) {
    return {
      success: false,
      message: "Only administrators can delete unused invitation codes",
    };
  }

  await prisma.invitationCode.delete({
    where: { id },
  });

  revalidatePath("/admin/invitation-codes");

  return {
    success: true,
    data: undefined,
  };
}
