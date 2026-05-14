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
      <div className="flex items-center h-12 px-4 sm:px-8">
        {/* Logo — left (flex-1 to balance with right section) */}
        <div className="flex-1 flex items-center">
          <Link href="/" className="flex items-baseline gap-[6px] shrink-0">
            <span
              className="text-xl font-medium leading-none"
              style={{
                fontFamily: "EuclidCircularA, sans-serif",
                color: "var(--gt-t1)",
                letterSpacing: "var(--gt-tracking-tight)",
              }}
            >
              atypica.AI
            </span>
            <span
              className="text-xl leading-none"
              style={{
                color: "var(--gt-t3)",
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontStyle: "italic",
              }}
            >
              Game Lab
            </span>
          </Link>
        </div>

        {/* Centered nav — naturally centered by equal flex-1 siblings */}
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

        {/* UserMenu — right (flex-1 to balance with left section) */}
        <div className="flex-1 flex items-center justify-end">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
