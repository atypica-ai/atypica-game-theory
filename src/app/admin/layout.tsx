import { Card } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { ReactNode } from "react";
import AdminMobileHeader from "./components/AdminMobileHeader";
import AdminSidebar from "./components/AdminSidebar";
import { isAdminUser } from "./utils";

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.email ? await isAdminUser(session.user.email) : false;

  return (
    <div className="h-dvh flex flex-col md:flex-row items-stretch justify-start overflow-hidden font-sans">
      {/* Mobile Header */}
      <AdminMobileHeader />

      {/* Sidebar */}
      <AdminSidebar isAdmin={isAdmin} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-3 md:p-6">
          <Card className="p-3 md:p-6">{children}</Card>
        </div>
      </main>
    </div>
  );
}
