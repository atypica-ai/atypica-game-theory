"use client";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/UserMenu";
import { AdminRole } from "@/prisma/client";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
  AlertTriangleIcon,
  BarChartIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CreditCardIcon,
  DatabaseIcon,
  EyeIcon,
  FileTextIcon,
  HeadphonesIcon,
  MonitorPlayIcon,
  SettingsIcon,
  StarIcon,
  UserIcon,
  UsersIcon,
  VideoIcon,
  X,
} from "lucide-react";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminPermission } from "../types";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  role?: "SUPER_ADMIN"; // Role-specific items
  permission?: AdminPermission;
}

interface SidebarGroup {
  label: string;
  items: SidebarItem[];
  alwaysShow?: boolean; // Groups that should always be visible
}

interface AdminSidebarProps {
  adminRole?: AdminRole;
  permissions?: AdminPermission[];
}

export default function AdminSidebar({ adminRole, permissions = [] }: AdminSidebarProps) {
  // State for collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("admin-sidebar-collapsed");
    if (saved) {
      try {
        setCollapsedGroups(new Set(JSON.parse(saved)));
      } catch {
        // Ignore parsing errors
      }
    }
  }, []);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem("admin-sidebar-collapsed", JSON.stringify([...collapsedGroups]));
  }, [collapsedGroups]);

  // Define grouped sidebar items
  const allSidebarGroups = useMemo<SidebarGroup[]>(
    () => [
      // {
      //   label: "Overview",
      //   alwaysShow: true,
      //   items: [
      //     {
      //       label: "Dashboard",
      //       href: "/admin",
      //       icon: <HomeIcon className="mr-2 h-4 w-4" />,
      //     },
      //   ],
      // },
      {
        label: "Content",
        items: [
          {
            label: "Reports",
            href: "/admin/analyst-reports",
            icon: <FileTextIcon className="mr-2 h-4 w-4" />,
            permission: AdminPermission.MANAGE_STUDIES,
          },
          {
            label: "Podcasts",
            href: "/admin/analyst-podcasts",
            icon: <HeadphonesIcon className="mr-2 h-4 w-4" />,
            permission: AdminPermission.MANAGE_STUDIES,
          },
          {
            label: "Studies",
            href: "/admin/studies",
            icon: <StarIcon className="mr-2 h-4 w-4" />,
            permission: AdminPermission.MANAGE_STUDIES,
          },
          {
            label: "Personas",
            href: "/admin/personas",
            icon: <UserIcon className="mr-2 h-4 w-4" />,
            permission: AdminPermission.MANAGE_PERSONAS,
          },
          {
            label: "Interviews",
            href: "/admin/interviews",
            icon: <VideoIcon className="mr-2 h-4 w-4" />,
            permission: AdminPermission.MANAGE_INTERVIEWS,
          },
        ],
      },
      {
        label: "Users",
        items: [
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
            label: "Team Configs",
            href: "/admin/team-configs",
            icon: <SettingsIcon className="mr-2 h-4 w-4" />,
            permission: AdminPermission.MANAGE_USERS,
          },
          // {
          //   label: "Enterprise Leads",
          //   href: "/admin/enterprise-leads",
          //   icon: <MessageCircleIcon className="mr-2 h-4 w-4" />,
          //   permission: AdminPermission.VIEW_ENTERPRISE_LEADS,
          // },
        ],
      },
      {
        label: "Analytics",
        items: [
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
        ],
      },
      {
        label: "System",
        items: [
          {
            label: "Token Consumption",
            href: "/admin/token-consumption",
            icon: <MonitorPlayIcon className="mr-2 h-4 w-4" />,
            permission: AdminPermission.VIEW_TOKEN_CONSUMPTION,
          },
          {
            label: "Issue Studies",
            href: "/admin/issue-studies",
            icon: <AlertTriangleIcon className="mr-2 h-4 w-4" />,
            role: "SUPER_ADMIN",
          },
          {
            label: "Maintenance Mode",
            href: "/admin/maintenance",
            icon: <AlertTriangleIcon className="mr-2 h-4 w-4" />,
            role: "SUPER_ADMIN",
          },
        ],
      },
      {
        label: "Quick Actions",
        alwaysShow: true,
        items: [
          {
            label: "View Site",
            href: "/",
            icon: <DatabaseIcon className="mr-2 h-4 w-4" />,
          },
        ],
      },
    ],
    [],
  );

  // Filter groups and items based on permissions and role
  const visibleGroups = useMemo(
    () =>
      allSidebarGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => {
            // Super admins can access everything
            if (adminRole === "SUPER_ADMIN") return true;

            // Items that require SUPER_ADMIN role are filtered out for others
            if (item.role === "SUPER_ADMIN") return false;

            // Items without permission requirements are accessible
            if (!item.permission) return true;

            // Check if user has the required permission
            return permissions.includes(item.permission);
          }),
        }))
        .filter((group) => group.items.length > 0), // Only show groups with visible items
    [adminRole, permissions, allSidebarGroups],
  );

  const toggleGroup = (groupLabel: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupLabel)) {
        next.delete(groupLabel);
      } else {
        next.add(groupLabel);
      }
      return next;
    });
  };

  const closeSidebar = () => {
    const sidebar = document.getElementById("admin-sidebar");
    sidebar?.classList.add("-translate-x-full");
    document.getElementById("sidebar-overlay")?.classList.add("hidden");
  };

  return (
    <>
      <aside
        id="admin-sidebar"
        className="w-full md:w-64 border-r bg-background -translate-x-full md:translate-x-0 fixed md:relative top-0 left-0 h-full z-40 transition-transform duration-300 ease-in-out shadow-lg md:shadow-none flex flex-col"
      >
        <div className="flex h-16 items-center border-b px-6 justify-between flex-shrink-0">
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
        <nav className="p-4 flex-1 overflow-y-auto">
          <div className="space-y-4">
            {visibleGroups.map((group) => (
              <div key={group.label}>
                {group.alwaysShow ? (
                  // Always visible groups (no collapse functionality)
                  <div>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.label}
                    </div>
                    <ul className="mt-2 space-y-1">
                      {group.items.map((item) => (
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
                  </div>
                ) : (
                  // Collapsible groups
                  <Collapsible.Root open={!collapsedGroups.has(group.label)}>
                    <Collapsible.Trigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between px-2 py-1 h-auto text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
                        onClick={() => toggleGroup(group.label)}
                      >
                        {group.label}
                        {collapsedGroups.has(group.label) ? (
                          <ChevronRightIcon className="h-3 w-3" />
                        ) : (
                          <ChevronDownIcon className="h-3 w-3" />
                        )}
                      </Button>
                    </Collapsible.Trigger>
                    <Collapsible.Content className="mt-2">
                      <ul className="space-y-1">
                        {group.items.map((item) => (
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
                    </Collapsible.Content>
                  </Collapsible.Root>
                )}
              </div>
            ))}
          </div>
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
