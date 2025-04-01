"use server";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

// Check if the user is authorized as an admin
export async function checkAdminAuth() {
  const session = await getServerSession(authOptions);

  // Check if the user is authenticated
  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  console.log(session?.user?.email);

  if (!(await isAdminUser(session.user?.email))) {
    throw new Error("Forbidden");
  }

  return session;
}

// Check if user is a super admin (from env var)
export async function isAdminUser(email: string): Promise<boolean> {
  const adminUsers = (process.env.ADMIN_USERS || "").split(",").map((email) => email.trim());
  return adminUsers.includes(email);
}
