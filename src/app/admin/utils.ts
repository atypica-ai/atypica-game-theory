"use server";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { forbidden } from "next/navigation";

// Check if the user is authorized as an admin
export async function checkAdminAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    forbidden();
  }

  // // Check if the user is authenticated
  // if (!session?.user?.email) {
  //   throw new Error("Unauthorized");
  // }

  if (!(await isAdminUser(session.user.email))) {
    forbidden();
  }

  return session.user;
}

// Check if user is a super admin (from env var)
export async function isAdminUser(email: string): Promise<boolean> {
  const adminUsers = (process.env.ADMIN_USERS || "").split(",").map((email) => email.trim());
  return adminUsers.includes(email);
}

export type PaginationInfo = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export async function checkTezignAuth() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    forbidden();
  }

  if (!session.user.email?.endsWith("@tezign.com")) {
    // throw new Error("Forbidden");
    forbidden();
  }

  return session.user;
}
