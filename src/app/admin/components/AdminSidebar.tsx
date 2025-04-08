"use client";

import { Button } from "@/components/ui/button";
import UserMenu from "@/components/UserMenu";
import { CreditCard, Database, Home, Key, MessageCircle, Star, Users, X } from "lucide-react";
import Link from "next/link";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface AdminSidebarProps {
  isAdmin: boolean;
}

export default function AdminSidebar({ isAdmin }: AdminSidebarProps) {
  const sidebarItemsAdmin: SidebarItem[] = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: <Home className="mr-2 h-4 w-4" />,
    },
    {
      label: "Featured Studies",
      href: "/admin/featured-studies",
      icon: <Star className="mr-2 h-4 w-4" />,
    },
    {
      label: "Invitation Codes",
      href: "/admin/invitation-codes",
      icon: <Key className="mr-2 h-4 w-4" />,
    },
    {
      label: "Users",
      href: "/admin/users",
      icon: <Users className="mr-2 h-4 w-4" />,
    },
    {
      label: "Payments",
      href: "/admin/payments",
      icon: <CreditCard className="mr-2 h-4 w-4" />,
    },
    {
      label: "Enterprise Leads",
      href: "/admin/enterprise-leads",
      icon: <MessageCircle className="mr-2 h-4 w-4" />,
    },
    {
      label: "View Site",
      href: "/",
      icon: <Database className="mr-2 h-4 w-4" />,
    },
  ];

  const sidebarItems: SidebarItem[] = [
    {
      label: "Invitation Codes",
      href: "/admin/invitation-codes",
      icon: <Key className="mr-2 h-4 w-4" />,
    },
    {
      label: "View Site",
      href: "/",
      icon: <Database className="mr-2 h-4 w-4" />,
    },
  ];

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
            {(isAdmin ? sidebarItemsAdmin : sidebarItems).map((item) => (
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
