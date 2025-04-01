"use client";
import Link from "next/link";
import UserMenu from "./UserMenu";

export default function GlobalHeader() {
  return (
    <header className="h-12 px-4 flex items-center justify-between z-10 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center">
        <Link href="/" className="block h-4 w-32 relative">
          <div className="font-EuclidCircularA font-bold text-lg leading-none">atypica.LLM</div>
          {/* <Image
            src="/_public/atypica.llm.svg"
            alt="atypica.LLM Logo"
            fill
            priority
            className="object-contain hidden dark:block"
          /> */}
        </Link>
      </div>
      <div className="flex items-center gap-4">
        <UserMenu />
      </div>
    </header>
  );
}
