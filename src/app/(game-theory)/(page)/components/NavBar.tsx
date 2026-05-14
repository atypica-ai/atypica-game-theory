"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      className="transition-transform duration-200"
      style={{ transform: open ? "rotate(90deg)" : "none" }}
    >
      {open ? (
        <>
          <line x1="4" y1="4" x2="16" y2="16" stroke="var(--gt-t1)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="16" y1="4" x2="4" y2="16" stroke="var(--gt-t1)" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          <line x1="3" y1="5.5" x2="17" y2="5.5" stroke="var(--gt-t1)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="3" y1="10" x2="17" y2="10" stroke="var(--gt-t1)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="3" y1="14.5" x2="17" y2="14.5" stroke="var(--gt-t1)" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function NavBar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [mobileOpen]);

  return (
    <>
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
          <nav className="hidden md:flex items-center gap-0.5">
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

          {/* Right side (flex-1 to balance with left section) */}
          <div className="flex-1 flex items-center justify-end gap-3">
            <div className="hidden md:block">
              <UserMenu />
            </div>
            <button
              className="md:hidden flex items-center justify-center size-9 -mr-1.5 cursor-pointer"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <HamburgerIcon open={mobileOpen} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
            style={{ animation: "navbar-fade-in 200ms ease" }}
          />
          <div
            className="absolute top-0 right-0 h-full w-64 flex flex-col"
            style={{
              background: "var(--gt-surface)",
              borderLeft: "1px solid var(--gt-border)",
              animation: "navbar-slide-in-right 250ms cubic-bezier(0.32, 0.72, 0, 1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sidebar header */}
            <div
              className="flex items-center justify-between h-12 px-4 border-b"
              style={{ borderColor: "var(--gt-border)" }}
            >
              <span className="text-sm font-medium" style={{ color: "var(--gt-t2)" }}>
                Menu
              </span>
              <button
                className="flex items-center justify-center size-9 -mr-1.5 cursor-pointer"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <HamburgerIcon open />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex flex-col py-2 px-2 gap-0.5">
              {NAV_ITEMS.map(({ label, href }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className="flex h-10 items-center px-3 text-sm rounded-md transition-colors"
                    style={{
                      fontWeight: active ? 500 : 400,
                      color: active ? "var(--gt-t1)" : "var(--gt-t3)",
                      background: active ? "var(--gt-row-alt)" : "transparent",
                    }}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            {/* User section at bottom */}
            <div
              className="mt-auto px-4 py-3 border-t"
              style={{ borderColor: "var(--gt-border)" }}
            >
              <UserMenu />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
