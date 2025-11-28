"use client";
import { MaintenanceNotification } from "@/components/MaintenanceNotification";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import UserMenu from "@/components/UserMenu";
import UserTokensBalance from "@/components/UserTokensBalance";
import { cn } from "@/lib/utils";
import { MenuIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import React, { useState } from "react";

/**
 * GlobalHeader is wrapped with React.memo to prevent unnecessary re-renders
 * when parent components update due to unrelated state changes.
 *
 * This is critical for pages with frequent updates (e.g., ChatReplay with progressive messages),
 * where the entire page tree re-renders but GlobalHeader's props remain unchanged.
 * Without memo, all header components (UserMenu, UserTokensBalance, TeamSwitchButton)
 * would unmount and remount on every parent update, losing their internal state (like Dialog open state).
 *
 * ⚠️ memo 是浅比较组件的 props，副作用是如果参数不是 primitives or stable references，不会触发更新，但是这里没问题，string + ReactNode 是可以触发更新的
 */
const GlobalHeader = React.memo(function GlobalHeader({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      <header
        className={cn(
          "relative shrink-0 h-16 px-4 flex items-center justify-between gap-2 bg-background/80 backdrop-blur-sm border-b border-border",
          className,
        )}
      >
        <div className="flex items-center gap-2 sm:gap-6">
          <div className="md:hidden mt-1">
            <GlobalHeaderMenusMobile />
          </div>
          <Link
            prefetch={true}
            href="/"
            className={cn("block h-4 w-24 mb-0.5 relative")}
            title="logo"
          >
            <div className="font-EuclidCircularA font-medium tracking-tight text-xl leading-none">
              atypica.AI
            </div>
            {/* <Image
            src="/_public/atypica.svg"
            alt="atypica Logo"
            fill
            priority
            className="object-contain hidden dark:block"
          /> */}
          </Link>
        </div>
        {children ? (
          children
        ) : (
          <>
            <div className="flex items-center gap-2 sm:gap-4">
              {/* additional menus */}
              <UserTokensBalance />
              <UserMenu />
              {/*<div className="md:hidden">
                <GlobalHeaderMenusMobile />
              </div>*/}
            </div>
            <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <GlobalHeaderMenusDesktop />
            </div>
          </>
        )}
      </header>
      <MaintenanceNotification />
    </>
  );
});

const MenuLink = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { children: React.ReactNode }) => (
  <Link
    prefetch={true}
    {...props}
    className={cn("p-1 text-sm font-normal hover:text-foreground/80 whitespace-nowrap", className)}
  >
    {children}
  </Link>
);

const GlobalHeaderMenusDesktop = () => {
  const t = useTranslations("Components.GlobalHeader");
  return (
    <div className="flex items-center gap-4">
      <MenuLink href="/featured-studies">{t("useCases")}</MenuLink>
      <MenuLink href="/newstudy">{t("marketResearch")}</MenuLink>
      <MenuLink href="/persona">{t("personaImport")}</MenuLink>
      <MenuLink href="/interview">{t("interviewProject")}</MenuLink>
      <MenuLink href="/pricing">{t("pricing")}</MenuLink>
      <MenuLink href="/insight-radio">{t("insightRadio")}</MenuLink>
    </div>
  );
};

const GlobalHeaderMenusMobile = () => {
  const t = useTranslations("Components.GlobalHeader");
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label="Toggle menu"
          className="h-9 p-0 has-[>svg]:px-0 hover:bg-transparent"
        >
          <MenuIcon className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-36">
        <DropdownMenuItem asChild>
          <MenuLink href="/">{t("home")}</MenuLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <MenuLink href="/featured-studies">{t("useCases")}</MenuLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <MenuLink href="/newstudy">{t("marketResearch")}</MenuLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <MenuLink href="/persona">{t("personaImport")}</MenuLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <MenuLink href="/interview">{t("interviewProject")}</MenuLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <MenuLink href="/pricing">{t("pricing")}</MenuLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <MenuLink href="/insight-radio">{t("insightRadio")}</MenuLink>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default GlobalHeader;
