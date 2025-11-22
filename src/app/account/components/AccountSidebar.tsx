"use client";
import { getUserTeamStatusAction } from "@/app/team/actions";
import { TeamSwitchButton } from "@/app/team/components/TeamSwitchButton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ExtractServerActionData } from "@/lib/serverAction";
import * as Collapsible from "@radix-ui/react-collapsible";
import {
  ArrowLeftRightIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CreditCardIcon,
  InfoIcon,
  KeyIcon,
  MenuIcon,
  SettingsIcon,
  User2Icon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: SidebarItem[];
}

export default function AccountSidebar() {
  const t = useTranslations("AccountPage.sidebar");
  const pathname = usePathname();
  const isSM = useMediaQuery("sm");

  const { status: sessionStatus, data: session } = useSession();
  const [teamStatus, setTeamStatus] = useState<ExtractServerActionData<
    typeof getUserTeamStatusAction
  > | null>(null);
  const [userInfo, setUserInfo] = useState<{
    userType: string;
    displayName: string;
  } | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Load expanded state from localStorage and auto-expand based on pathname
  useEffect(() => {
    const saved = localStorage.getItem("account-sidebar-expanded");
    let expanded = new Set<string>();

    if (saved) {
      try {
        expanded = new Set(JSON.parse(saved));
      } catch {
        // Ignore parsing errors
      }
    }

    // Auto-expand team menu if current path is under /team
    if (pathname.startsWith("/team")) {
      expanded.add("/team");
    }

    setExpandedItems(expanded);
  }, [pathname]);

  // Save expanded state to localStorage
  useEffect(() => {
    localStorage.setItem("account-sidebar-expanded", JSON.stringify([...expandedItems]));
  }, [expandedItems]);

  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

  // 加载用户团队状态和用户信息
  useEffect(() => {
    if (sessionStatus === "loading") {
      setUserInfo(null);
      return;
    }

    if (session?.user) {
      // 更新用户信息
      const userType =
        session.userType === "TeamMember"
          ? t("teamUser")
          : session.userType === "Personal"
            ? t("personalUser")
            : "-";
      const displayName = session.user.email || session.user.name || "";
      setUserInfo({ userType, displayName });

      // 加载团队状态
      getUserTeamStatusAction().then((result) => {
        if (result.success) {
          setTeamStatus(result.data);
        }
      });
    } else {
      setUserInfo(null);
    }
  }, [sessionStatus, session, t]);

  const sidebarItems = useMemo(() => {
    const sidebarItems: SidebarItem[] = [
      {
        label: t("accountIndex"),
        href: "/account",
        icon: <User2Icon className="mr-2 h-4 w-4" />,
      },
      {
        label: t("profile"),
        href: "/account/profile",
        icon: <SettingsIcon className="mr-2 h-4 w-4" />,
      },
      {
        label: t("tokens"),
        href: "/account/tokens",
        icon: <WalletIcon className="mr-2 h-4 w-4" />,
      },
      {
        label: t("paymentHistory"),
        href: "/account/payment",
        icon: <CreditCardIcon className="mr-2 h-4 w-4" />,
      },
    ];

    if (teamStatus?.teamRole === "owner") {
      sidebarItems.push({
        label: t("teamManagement"),
        href: "/team",
        icon: <UsersIcon className="mr-2 h-4 w-4" />,
        children: [
          {
            label: t("teamInfo"),
            href: "/team",
            icon: <InfoIcon className="mr-2 h-4 w-4" />,
          },
          {
            label: t("teamApiKeys"),
            href: "/team/api-keys",
            icon: <KeyIcon className="mr-2 h-4 w-4" />,
          },
        ],
      });
    }

    return sidebarItems;
  }, [teamStatus, t]);

  return (
    <aside className="w-full sm:w-48 lg:w-64 max-sm:border-t sm:border-r">
      <div className="flex h-16 items-center border-b px-6 justify-between">
        <div className="space-x-2 truncate">
          {userInfo && (
            <>
              <span className="text-xs px-1 py-1 rounded-xs bg-zinc-200 dark:bg-zinc-700">
                {userInfo.userType}
              </span>
              <span className="text-xs">{userInfo.displayName}</span>
            </>
          )}
        </div>
        {!isSM && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" aria-label="Toggle menu" size="icon" className="sm:hidden">
                <MenuIcon className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-36">
              {sidebarItems.map((item) => {
                if (item.children) {
                  // Flatten children in mobile dropdown
                  return [
                    <DropdownMenuItem asChild key={item.href} className="font-medium">
                      <Link href={item.href}>
                        {item.icon}
                        {item.label}
                      </Link>
                    </DropdownMenuItem>,
                    ...item.children.map((child) => (
                      <DropdownMenuItem asChild key={child.href} className="pl-8">
                        <Link href={child.href}>
                          {child.icon}
                          {child.label}
                        </Link>
                      </DropdownMenuItem>
                    )),
                  ];
                }
                return (
                  <DropdownMenuItem asChild key={item.href}>
                    <Link href={item.href}>
                      {item.icon}
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {isSM && (
        <nav className="p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => {
              if (item.children) {
                const isExpanded = expandedItems.has(item.href);
                const isActive = pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Collapsible.Root
                      open={isExpanded}
                      onOpenChange={() => toggleExpanded(item.href)}
                    >
                      <Collapsible.Trigger asChild>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className="w-full justify-start"
                        >
                          {item.icon}
                          {item.label}
                          {isExpanded ? (
                            <ChevronDownIcon className="ml-auto h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="ml-auto h-4 w-4" />
                          )}
                        </Button>
                      </Collapsible.Trigger>
                      <Collapsible.Content>
                        <ul className="ml-6 mt-2 space-y-2">
                          {item.children.map((child) => (
                            <li key={child.href}>
                              <Button
                                asChild
                                variant={pathname === child.href ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                size="sm"
                              >
                                <Link href={child.href}>
                                  {child.icon}
                                  {child.label}
                                </Link>
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </Collapsible.Content>
                    </Collapsible.Root>
                  </li>
                );
              }
              return (
                <li key={item.href}>
                  <Button
                    asChild
                    variant={pathname === item.href ? "secondary" : "ghost"}
                    className="w-full justify-start"
                  >
                    <Link href={item.href}>
                      {item.icon}
                      {item.label}
                    </Link>
                  </Button>
                </li>
              );
            })}
            {teamStatus?.canSwitchIdentity && (
              <li>
                <TeamSwitchButton>
                  <Button variant="ghost" className="w-full justify-start">
                    <ArrowLeftRightIcon className="mr-2 h-4 w-4" />
                    {t("switchIdentity")}
                  </Button>
                </TeamSwitchButton>
              </li>
            )}
          </ul>
        </nav>
      )}
    </aside>
  );
}
