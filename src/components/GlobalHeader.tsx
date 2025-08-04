"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MenuIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { MaintenanceNotification } from "./MaintenanceNotification";
import UserMenu from "./UserMenu";
import UserTokensBalance from "./UserTokensBalance";

export default function GlobalHeader({
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
          <Link href="/" className={cn("block h-4 w-24 mb-0.5 relative")}>
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
              <div className="sm:hidden">
                <GlobalHeaderMenusMobile />
              </div>
            </div>
            <div className="hidden sm:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <GlobalHeaderMenusDesktop />
            </div>
          </>
        )}
      </header>
      <MaintenanceNotification />
    </>
  );
}

const MenuLink = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { children: React.ReactNode }) => (
  <Link {...props} className={cn("p-1 text-sm font-normal hover:text-foreground/80", className)}>
    {children}
  </Link>
);

const GlobalHeaderMenusDesktop = () => {
  const t = useTranslations("Components.GlobalHeader");
  return (
    <div className="flex items-center gap-4">
      <MenuLink href="/featured-studies">{t("useCases")}</MenuLink>
      <MenuLink href="/study">{t("marketResearch")}</MenuLink>
      <MenuLink href="/persona">{t("personaImport")}</MenuLink>
      <MenuLink href="/pricing">{t("pricing")}</MenuLink>
    </div>
  );
};

const GlobalHeaderMenusMobile = () => {
  const t = useTranslations("Components.GlobalHeader");
  const [isOpen, setIsOpen] = useState(false);
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" aria-label="Toggle menu" size="icon">
          <MenuIcon className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-36">
        <DropdownMenuItem asChild>
          <MenuLink href="/featured-studies">{t("useCases")}</MenuLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <MenuLink href="/study">{t("marketResearch")}</MenuLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <MenuLink href="/persona">{t("personaImport")}</MenuLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <MenuLink href="/pricing">{t("pricing")}</MenuLink>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
