"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertTriangleIcon,
  BookOpenIcon,
  ExternalLinkIcon,
  MessageSquareIcon,
  MicIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TabNavigation({ sageToken }: { sageToken: string }) {
  const t = useTranslations("Sage.detail");
  const pathname = usePathname();

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
    },
    {
      name: t("chats"),
      href: `/sage/${sageToken}/chats`,
      icon: MessageSquareIcon,
    },
    {
      name: t("interviews"),
      href: `/sage/${sageToken}/interviews`,
      icon: MicIcon,
    },
    {
      name: t("gaps"),
      href: `/sage/${sageToken}/gaps`,
      icon: AlertTriangleIcon,
    },
  ];

  const isActive = (tab: (typeof tabs)[0]) => {
    if (tab.exact) {
      return pathname === tab.href;
    }
    return pathname.startsWith(tab.href);
  };

  return (
    <div
      className={cn(
        "border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60",
        "flex items-center justify-between pr-4",
      )}
    >
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
              {tab.name}
            </Link>
          );
        })}
      </nav>
      <Button variant="default" size="sm" asChild>
        <Link href={`/sage/profile/${sageToken}`} target="_blank">
          <ExternalLinkIcon className="size-4" />
          {t("viewPublicProfile")}
        </Link>
      </Button>
    </div>
  );
}
