"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/ui", label: "Component Library" },
  { href: "/admin/ui/guide", label: "Design Guide" },
];

export default function AdminUILayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 border-b border-border pb-px">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/admin/ui" ? pathname === "/admin/ui" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors -mb-px",
                isActive
                  ? "border-b-2 border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
