"use server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { checkAdminAuth, checkTezignAuth, isAdminUser } from "../utils";

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
  const user = await checkTezignAuth();

  // Check if user is admin to determine visibility
  const isAdmin = await isAdminUser(user.email);

  const invitationCodes = await prisma.invitationCode.findMany({
    where: isAdmin ? {} : { createdBy: user.email },
    orderBy: { createdAt: "desc" },
  });

  // Add isAdmin flag to the response for UI to use
  return {
    data: invitationCodes,
    isAdmin,
  };
}

// Create a new invitation code
export async function createInvitationCode() {
  const user = await checkTezignAuth();

  // Check if user already has 5 invitation codes
  const existingCodeCount = await prisma.invitationCode.count({
    where: {
      createdBy: user.email,
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
      createdBy: user.email,
    },
  });

  revalidatePath("/admin/invitation-codes");

  return { data: invitationCode };
}

// Delete an invitation code
export async function deleteInvitationCode(id: number) {
  const user = await checkAdminAuth();

  // Check if the code exists
  const invitationCode = await prisma.invitationCode.findUnique({
    where: { id },
  });

  if (!invitationCode) {
    throw new Error("Invitation code not found");
  }

  const isAdmin = await isAdminUser(user.email);

  if (!isAdmin && invitationCode.createdBy !== user.email) {
    throw new Error("You can only delete your own invitation codes");
  }

  if (!isAdmin || invitationCode.usedBy) {
    throw new Error("Only administrators can delete unused invitation codes");
  }

  await prisma.invitationCode.delete({
    where: { id },
  });

  revalidatePath("/admin/invitation-codes");
}
