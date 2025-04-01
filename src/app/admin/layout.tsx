import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import UserMenu from "@/components/UserMenu";
import { authOptions } from "@/lib/auth";
import { Database, Home, Key, Star, Users } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { ReactNode } from "react";
import { isAdminUser } from "./utils";

interface AdminLayoutProps {
  children: ReactNode;
}

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

// Define sidebar navigation items
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

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.email ? await isAdminUser(session.user.email) : false;

  return (
    <div className="flex min-h-screen font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r">
        <div className="flex h-16 items-center border-b px-6 justify-between">
          <h1 className="text-lg font-bold">Admin Panel</h1>
          <UserMenu />
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            {(isAdmin ? sidebarItemsAdmin : sidebarItems).map((item) => (
              <li key={item.href}>
                <Button asChild variant="ghost" className="w-full justify-start">
                  <Link href={item.href}>
                    {item.icon}
                    {item.label}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1">
        <div className="flex h-16 items-center border-b px-6">
          <h2 className="text-lg font-semibold">Admin Control Panel</h2>
        </div>
        <div className="p-6">
          <Card className="p-6">{children}</Card>
        </div>
      </main>
    </div>
  );
}
