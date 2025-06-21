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
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

export function LeftMenus() {
  const { data: session } = useSession();
  const t = useTranslations("Components.GlobalHeader");

  const MenuLink = ({
    className,
    children,
    ...props
  }: React.ComponentProps<typeof Link> & { children: React.ReactNode }) => (
    <Link {...props} className={cn("p-1 text-sm font-normal hover:text-foreground/80", className)}>
      {children}
    </Link>
  );

  const DesktopMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div className="hidden sm:flex items-center gap-4">
        <MenuLink href="/studies">{t("myStudies")}</MenuLink>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <MenuLink href="/about" target="_blank">
              {t("about")}
            </MenuLink>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem asChild>
              <MenuLink href="/about" target="_blank">
                {t("about")}
              </MenuLink>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <MenuLink href="/persona-simulation" target="_blank">
                {t("personaSimulation")}
              </MenuLink>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <MenuLink href="/changelog" target="_blank">
                {t("changelog")}
              </MenuLink>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <MenuLink href="/pricing">{t("pricing")}</MenuLink>
      </div>
    );
  };

  const MobileMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" aria-label="Toggle menu" size="icon" className="sm:hidden">
            <MenuIcon className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-36">
          <DropdownMenuItem asChild>
            {session?.user ? (
              <MenuLink href="/studies">{t("myStudies")}</MenuLink>
            ) : (
              <MenuLink href="/featured-studies">{t("featuredStudies")}</MenuLink>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <MenuLink href="/persona-simulation">{t("personaSimulation")}</MenuLink>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <MenuLink href="/about">{t("about")}</MenuLink>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <MenuLink href="/changelog">{t("changelog")}</MenuLink>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <MenuLink href="/pricing">{t("pricing")}</MenuLink>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <>
      {/* 桌面端显示 */}
      <DesktopMenu />
      {/* 移动端显示 */}
      <MobileMenu />
    </>
  );
}
