import authOptions from "@/app/(auth)/authOptions";
import { Card } from "@/components/ui/card";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { forbidden } from "next/navigation";
import { ReactNode } from "react";
import AdminMobileHeader from "./components/AdminMobileHeader";
import AdminSidebar from "./components/AdminSidebar";
import { AdminPermission } from "./types";

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getServerSession(authOptions);

  const user = session?.user?.email
    ? await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { adminUser: true },
      })
    : null;

  if (!user?.adminUser) {
    forbidden();
  }

  const adminRole = user.adminUser.role;

  // Get user permissions
  let permissions: AdminPermission[] = [];
  if (session?.user?.id) {
    const adminUser = await prisma.adminUser.findUnique({
      where: { userId: session.user.id },
    });
    permissions = (adminUser?.permissions || []) as AdminPermission[];
  }

  // A regular admin must have at least one permission to access the admin panel.
  if (user.adminUser.role === "REGULAR_ADMIN" && permissions.length === 0) {
    forbidden();
  }

  return (
    <div className="h-dvh flex flex-col md:flex-row items-stretch justify-start overflow-hidden font-sans">
      {/* Mobile Header */}
      <AdminMobileHeader />
      {/* Sidebar */}
      <AdminSidebar adminRole={adminRole} permissions={permissions} />
      {/* Main content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-3 md:p-6">
          <Card className="p-3 md:p-6">{children}</Card>
        </div>
      </main>
    </div>
  );
}
