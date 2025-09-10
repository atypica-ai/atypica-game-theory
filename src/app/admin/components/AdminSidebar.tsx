"use client";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/UserMenu";
import { AdminRole } from "@/prisma/client";
import {
  AlertTriangleIcon,
  BarChartIcon,
  CreditCardIcon,
  DatabaseIcon,
  EyeIcon,
  FileTextIcon,
  HomeIcon,
  MessageCircleIcon,
  MonitorPlayIcon,
  StarIcon,
  UserIcon,
  UsersIcon,
  X,
} from "lucide-react";

import Link from "next/link";
import { useMemo } from "react";
import { AdminPermission } from "../types";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  role?: "SUPER_ADMIN"; // Role-specific items
}

interface AdminSidebarProps {
  adminRole?: AdminRole;
  permissions?: AdminPermission[];
}

export default function AdminSidebar({ adminRole, permissions = [] }: AdminSidebarProps) {
  // Define all available sidebar items with their required permissions
  const allSidebarItems = useMemo<(SidebarItem & { permission?: AdminPermission })[]>(
    () => [
      {
        label: "Dashboard",
        href: "/admin",
        icon: <HomeIcon className="mr-2 h-4 w-4" />,
        // Dashboard accessible to all admins
      },
      {
        label: "Analyst Reports",
        href: "/admin/analyst-reports",
        icon: <FileTextIcon className="mr-2 h-4 w-4" />,
        permission: AdminPermission.MANAGE_STUDIES,
      },
      {
        label: "Featured Studies",
        href: "/admin/featured-studies",
        icon: <StarIcon className="mr-2 h-4 w-4" />,
        permission: AdminPermission.MANAGE_STUDIES,
      },
      {
        label: "Token Consumption",
        href: "/admin/token-consumption",
        icon: <MonitorPlayIcon className="mr-2 h-4 w-4" />,
        permission: AdminPermission.VIEW_TOKEN_CONSUMPTION,
      },
      {
        label: "Statistics",
        href: "/admin/statistics",
        icon: <BarChartIcon className="mr-2 h-4 w-4" />,
        permission: AdminPermission.VIEW_STATISTICS,
      },
      {
        label: "Page Views",
        href: "/admin/pageviews",
        icon: <EyeIcon className="mr-2 h-4 w-4" />,
        permission: AdminPermission.VIEW_STATISTICS,
      },
      {
        label: "Users",
        href: "/admin/users",
        icon: <UserIcon className="mr-2 h-4 w-4" />,
        permission: AdminPermission.MANAGE_USERS,
      },
      {
        label: "Teams",
        href: "/admin/teams",
        icon: <UsersIcon className="mr-2 h-4 w-4" />,
        permission: AdminPermission.MANAGE_USERS,
      },
      {
        label: "Payments",
        href: "/admin/payments",
        icon: <CreditCardIcon className="mr-2 h-4 w-4" />,
        permission: AdminPermission.MANAGE_PAYMENTS,
      },
      {
        label: "Enterprise Leads",
        href: "/admin/enterprise-leads",
        icon: <MessageCircleIcon className="mr-2 h-4 w-4" />,
        permission: AdminPermission.VIEW_ENTERPRISE_LEADS,
      },
      {
        label: "Personas",
        href: "/admin/personas",
        icon: <UserIcon className="mr-2 h-4 w-4" />,
        permission: AdminPermission.MANAGE_PERSONAS,
      },
      {
        label: "Issue Studies",
        href: "/admin/issue-studies",
        icon: <AlertTriangleIcon className="mr-2 h-4 w-4" />,
        // Only for super admins
        role: "SUPER_ADMIN",
      },
      {
        label: "Maintenance Mode",
        href: "/admin/maintenance",
        icon: <AlertTriangleIcon className="mr-2 h-4 w-4" />,
        role: "SUPER_ADMIN",
      },
      {
        label: "View Site",
        href: "/",
        icon: <DatabaseIcon className="mr-2 h-4 w-4" />,
        // View site accessible to all
      },
    ],
    [],
  );

  // Filter items based on permissions and role
  const sidebarItems = useMemo(
    () =>
      allSidebarItems.filter((item) => {
        // Super admins can access everything
        if (adminRole === "SUPER_ADMIN") return true;

        // Items that require SUPER_ADMIN role are filtered out for others
        if (item.role === "SUPER_ADMIN") return false;

        // Items without permission requirements are accessible
        if (!item.permission) return true;

        // Check if user has the required permission
        return permissions.includes(item.permission);
      }),
    [adminRole, permissions, allSidebarItems],
  );

  const closeSidebar = () => {
    const sidebar = document.getElementById("admin-sidebar");
    sidebar?.classList.add("-translate-x-full");
    document.getElementById("sidebar-overlay")?.classList.add("hidden");
  };

  return (
    <>
      <aside
        id="admin-sidebar"
        className="w-full md:w-64 border-r bg-background -translate-x-full md:translate-x-0 fixed md:relative top-0 left-0 h-full z-40 transition-transform duration-300 ease-in-out shadow-lg md:shadow-none"
      >
        <div className="flex h-16 items-center border-b px-6 justify-between">
          <h1 className="text-lg font-bold">Admin Panel</h1>
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <UserMenu />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Close Menu"
              onClick={closeSidebar}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.href}>
                <Button asChild variant="ghost" className="w-full justify-start">
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (window.innerWidth < 768) {
                        closeSidebar();
                      }
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Overlay for mobile sidebar */}
      <div
        id="sidebar-overlay"
        className="fixed inset-0 bg-black/50 z-30 md:hidden hidden"
        onClick={closeSidebar}
      ></div>
    </>
  );
}
