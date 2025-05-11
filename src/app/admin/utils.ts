import { authOptions } from "@/lib/auth";
import { AdminRole } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { forbidden } from "next/navigation";

export enum AdminPermission {
  MANAGE_STUDIES = "MANAGE_STUDIES",
  MANAGE_USERS = "MANAGE_USERS",
  MANAGE_PAYMENTS = "MANAGE_PAYMENTS",
  MANAGE_INVITATION_CODES = "MANAGE_INVITATION_CODES",
  VIEW_ENTERPRISE_LEADS = "VIEW_ENTERPRISE_LEADS",
  VIEW_TOKEN_CONSUMPTION = "VIEW_TOKEN_CONSUMPTION",
  MANAGE_MAINTENANCE = "MANAGE_MAINTENANCE",
}

export type PaginationInfo = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

/**
 * Check if the user is authorized as an admin with specific permissions
 * @param requiredPermissions Optional permissions to check
 */
export async function checkAdminAuth(requiredPermissions: AdminPermission[] | "SUPER_ADMIN") {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    forbidden();
  }
  // Check AdminUser table for permissions
  const adminUser = await prisma.adminUser.findUnique({
    where: { userId: session.user.id },
  });
  // If no admin record, not an admin
  if (!adminUser) {
    forbidden();
  }
  if (requiredPermissions === "SUPER_ADMIN") {
    if (adminUser.role !== AdminRole.SUPER_ADMIN) {
      forbidden();
    }
    return session.user;
  } else {
    if (!requiredPermissions) {
      throw new Error("Required permissions not provided");
    }
    if (adminUser.role === AdminRole.SUPER_ADMIN) {
      return session.user;
    }
    // If permissions are required, check them
    const hasAllPermissions = requiredPermissions.every((permission) =>
      (adminUser.permissions as AdminPermission[]).includes(permission),
    );
    if (!hasAllPermissions) {
      forbidden();
    }
    return session.user;
  }
}

/**
 * Check if user has specific admin permissions
 */
export async function hasPermission(email: string, permission: AdminPermission): Promise<boolean> {
  // Check permissions in AdminUser table
  const user = await prisma.user.findUnique({
    where: { email },
    include: { adminUser: true },
  });
  if (!user?.adminUser) {
    return false;
  }
  // Super admins have all permissions
  if (user.adminUser.role === AdminRole.SUPER_ADMIN) {
    return true;
  }
  return (user.adminUser.permissions as AdminPermission[]).includes(permission);
}

/**
 * Check for Tezign users
 */
export async function checkTezignAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    forbidden();
  }
  if (!session.user.email.endsWith("@tezign.com")) {
    forbidden();
  }
  return session.user;
}
