"use client";
import { LegacyUserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function AdminMobileHeader() {
  const toggleSidebar = () => {
    const sidebar = document.getElementById("admin-sidebar");
    const overlay = document.getElementById("sidebar-overlay");

    sidebar?.classList.toggle("-translate-x-full");

    if (sidebar?.classList.contains("-translate-x-full")) {
      overlay?.classList.add("hidden");
    } else {
      overlay?.classList.remove("hidden");
    }
  };

  return (
    <header className="md:hidden border-b px-4 py-3 flex items-center justify-between sticky top-0 bg-background z-10">
      <h1 className="text-lg font-bold">Admin Panel</h1>
      <div className="flex items-center gap-2">
        <LegacyUserMenu />
        <Button
          variant="outline"
          size="icon"
          className="md:hidden"
          aria-label="Toggle Menu"
          onClick={toggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
