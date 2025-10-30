"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { BookOpenIcon, MessageSquareIcon, AlertTriangleIcon } from "lucide-react";

export function TabNavigation({ sageToken }: { sageToken: string }) {
  const t = useTranslations("Sage.detail");
  const pathname = usePathname();

  const tabs = [
    {
      name: t("memory"),
      href: `/sage/${sageToken}`,
      icon: BookOpenIcon,
      exact: true,
    },
    {
      name: t("chats"),
      href: `/sage/${sageToken}/chats`,
      icon: MessageSquareIcon,
    },
    {
      name: t("gaps"),
      href: `/sage/${sageToken}/gaps`,
      icon: AlertTriangleIcon,
    },
  ];

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.exact) {
      return pathname === tab.href;
    }
    return pathname.startsWith(tab.href);
  };

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="flex space-x-1 px-4" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
