"use client";
import { useSageContext } from "@/app/(sage)/(detail)/hooks/SageContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AlertTriangleIcon, BookOpenIcon, MessageSquareIcon, MicIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TabNavigation({ sageToken }: { sageToken: string }) {
  const t = useTranslations("Sage.TabNavigation");
  const pathname = usePathname();
  const { stats } = useSageContext();

  const tabs = [
    {
      name: t("sageProfile"),
      href: `/sage/${sageToken}`,
      icon: BookOpenIcon,
      exact: true,
    },
    {
      name: t("memory"),
      href: `/sage/${sageToken}/memory`,
      icon: BookOpenIcon,
      exact: true,
      count: stats.memoryVersion,
    },
    {
      name: t("chats"),
      href: `/sage/${sageToken}/chats`,
      icon: MessageSquareIcon,
      count: stats.chatsCount,
    },
    {
      name: t("interviews"),
      href: `/sage/${sageToken}/interviews`,
      icon: MicIcon,
      count: stats.interviewsCount,
    },
    {
      name: t("gaps"),
      href: `/sage/${sageToken}/gaps`,
      icon: AlertTriangleIcon,
      count: stats.gapsCount,
      highlight: true,
    },
  ];

  const isActive = (tab: (typeof tabs)[0]) => {
    if (tab.exact) {
      return pathname === tab.href;
    }
    return pathname.startsWith(tab.href);
  };

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
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
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.name}</span>
              {typeof tab.count === "number" && (
                <Badge
                  variant={
                    tab.highlight && tab.count > 0
                      ? "destructive"
                      : active
                        ? "default"
                        : "secondary"
                  }
                  className={cn(
                    "ml-1 h-5 px-1.5 text-xs font-medium",
                    active ? "" : "bg-muted text-muted-foreground",
                  )}
                >
                  {tab.count}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
