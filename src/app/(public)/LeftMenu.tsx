"use client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MenuIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import React, { useState } from "react";

export function LeftMenus() {
  const { data: session } = useSession();
  const t = useTranslations("Components.GlobalHeader");

  const menuItems = [
    <Link
      key={0}
      href="/pricing"
      className="text-sm font-normal hover:text-foreground/80"
      onClick={(e) => e.currentTarget.blur()}
    >
      {t("pricing")}
    </Link>,
    <Link
      key={1}
      href="/changelog"
      className="text-sm font-normal hover:text-foreground/80"
      target="_blank"
      onClick={(e) => e.currentTarget.blur()}
    >
      {t("changelog")}
    </Link>,
    <Link
      key={2}
      href="/about"
      className="text-sm font-normal hover:text-foreground/80"
      target="_blank"
      onClick={(e) => e.currentTarget.blur()}
    >
      {t("about")}
    </Link>,
    session?.user ? (
      <Link
        key={3}
        href="/study"
        className="text-sm font-normal hover:text-foreground/80"
        onClick={(e) => e.currentTarget.blur()}
      >
        <span>{t("myStudies")}</span>
      </Link>
    ) : null,
  ];
  // <Link href="/featured-studies" className="text-sm font-normal">
  //   <span>{t("featuredStudies")}</span>
  // </Link>

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
          {menuItems.map((menuItem, index) => (
            <DropdownMenuItem key={index}>{menuItem}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <>
      {/* 桌面端显示 */}
      <div className="hidden sm:flex items-center gap-6">
        {menuItems.map((menuItem, index) => (
          <React.Fragment key={index}>{menuItem}</React.Fragment>
        ))}
      </div>

      {/* 移动端显示 */}
      <MobileMenu />
    </>
  );
}
