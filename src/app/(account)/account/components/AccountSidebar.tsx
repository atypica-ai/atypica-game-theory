"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMediaQuery } from "@/hooks/use-media-query";
import { CreditCardIcon, MenuIcon, SettingsIcon, User2Icon, WalletIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export default function AccountSidebar() {
  const t = useTranslations("AccountPage.sidebar");
  const pathname = usePathname();

  const isSM = useMediaQuery("sm");

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
    // {
    //   label: t("team"),
    //   href: "/team/manage",
    //   icon: <Users className="mr-2 h-4 w-4" />,
    // },
  ];

  return (
    <aside className="w-full md:w-64 border-r">
      <div className="flex h-16 items-center border-b px-6 justify-between">
        <h1 className="text-lg font-bold">{t("title")}</h1>
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
          </ul>
        </nav>
      )}
    </aside>
  );
}
