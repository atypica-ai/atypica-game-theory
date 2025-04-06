"use client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import UserMenu from "./UserMenu";
import UserPointsBalance from "./UserPointsBalance";

export default function GlobalHeader({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header
      className={cn(
        "h-12 px-4 flex items-center justify-start gap-4 bg-background/80 backdrop-blur-sm border-b border-border",
        className,
      )}
    >
      <div className="flex items-center">
        <Link href="/" className="block h-4 w-32 relative">
          <div className="font-EuclidCircularA font-bold text-lg leading-none">atypica.AI</div>
          {/* <Image
            src="/_public/atypica.svg"
            alt="atypica Logo"
            fill
            priority
            className="object-contain hidden dark:block"
          /> */}
        </Link>
      </div>
      <div className="ml-auto" />
      {/* additional menus */}
      {children ? children : <UserPointsBalance />}

      <div>
        <UserMenu />
      </div>
    </header>
  );
}
