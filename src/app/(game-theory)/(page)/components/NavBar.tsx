"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "./UserMenu";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Games", href: "/games" },
  { label: "Stats", href: "/stats" },
  { label: "Play", href: "/play/new" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function NavBar() {
  const pathname = usePathname();

  return (
    <header
      className="shrink-0 border-b"
      style={{ borderColor: "var(--gt-border)", background: "var(--gt-surface)" }}
    >
      <div
        className="relative mx-auto flex items-center justify-center h-12 px-4 sm:px-8"
        style={{ maxWidth: "1200px" }}
      >
        {/* Logo — pinned left */}
        <Link href="/" className="absolute left-4 sm:left-8 flex flex-col">
          <span
            className="text-[17px] font-medium leading-none"
            style={{
              fontFamily: "EuclidCircularA, sans-serif",
              color: "var(--gt-t1)",
              letterSpacing: "var(--gt-tracking-tight)",
            }}
          >
            atypica.AI
          </span>
          <span
            className="text-[10px] leading-none mt-1"
            style={{
              color: "var(--gt-t4)",
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontStyle: "italic",
              letterSpacing: "0.01em",
            }}
          >
            Game Theory Lab
          </span>
        </Link>

        {/* Centered nav items */}
        <nav className="flex items-center gap-0.5">
          {NAV_ITEMS.map(({ label, href }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className="flex h-9 items-center px-4 text-sm transition-all"
                style={{
                  borderRadius: "0.375rem",
                  fontWeight: 400,
                  color: active ? "var(--gt-t1)" : "var(--gt-t3)",
                  background: active ? "var(--gt-row-alt)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = "var(--gt-t1)";
                    e.currentTarget.style.background = "var(--gt-row-alt)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = "var(--gt-t3)";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* UserMenu — pinned right */}
        <div className="absolute right-4 sm:right-8">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
