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
import {
  ArrowLeftRightIcon,
  CreditCardIcon,
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
}

export default function AccountSidebar() {
  const { data: session } = useSession();
  const t = useTranslations("AccountPage.sidebar");
  const pathname = usePathname();
  const isSM = useMediaQuery("sm");

  const [teamStatus, setTeamStatus] = useState<ExtractServerActionData<
    typeof getUserTeamStatusAction
  > | null>(null);

  // 加载用户团队状态
  useEffect(() => {
    if (session?.user) {
      getUserTeamStatusAction().then((result) => {
        if (result.success) {
          setTeamStatus(result.data);
        }
      });
    }
  }, [session?.user]);

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
      });
    }

    return sidebarItems;
  }, [teamStatus, t]);

  return (
    <aside className="w-full sm:w-48 lg:w-64 max-sm:border-t sm:border-r">
      <div className="flex h-16 items-center border-b px-6 justify-between">
        <div className="space-x-2 truncate">
          <span className="text-xs px-1 py-1 rounded-xs bg-zinc-200 dark:bg-zinc-700">
            {session?.userType === "TeamMember"
              ? t("teamUser")
              : session?.userType === "Personal"
                ? t("personalUser")
                : "-"}
          </span>
          <span className="text-xs">{session?.user?.email || session?.user?.name}</span>
        </div>
        {!isSM && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" aria-label="Toggle menu" size="icon" className="sm:hidden">
                <MenuIcon className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-36">
              {sidebarItems.map((item) => (
                <DropdownMenuItem asChild key={item.href}>
                  <Link href={item.href}>
                    {item.icon}
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {isSM && (
        <nav className="p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
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
            ))}
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
