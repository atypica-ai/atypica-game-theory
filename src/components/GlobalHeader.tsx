"use client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { MaintenanceNotification } from "./MaintenanceNotification";
import UserMenu from "./UserMenu";
import UserTokensBalance from "./UserTokensBalance";

export default function GlobalHeader({
  className,
  children,
  leftMenus,
}: {
  className?: string;
  children?: React.ReactNode;
  leftMenus?: React.ReactNode;
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
          {leftMenus}
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          {/* additional menus */}
          {children ? children : <UserTokensBalance />}
          <UserMenu />
        </div>
      </header>
      <MaintenanceNotification />
    </>
  );
}
