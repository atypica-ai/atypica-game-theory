"use client";

import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function UserMenu() {
  const { data: session, status } = useSession();
  const t = useTranslations("Auth.UserMenu");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  if (status === "loading") {
    return <div className="size-8 rounded-full" style={{ background: "var(--gt-row-alt)" }} />;
  }

  if (!session?.user) {
    return (
      <Link
        href="/auth/signin"
        className="text-sm font-medium"
        style={{ color: "var(--gt-blue)" }}
      >
        {t("signIn")}
      </Link>
    );
  }

  const user = session.user;

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 cursor-pointer"
      >
        <HippyGhostAvatar seed={user.id} className="size-7 rounded-full" />
        <span
          className="text-sm font-medium hidden sm:inline"
          style={{
            color: "var(--gt-t1)",
            letterSpacing: "var(--gt-tracking-tight)",
          }}
        >
          {user.name || user.email}
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 min-w-[160px] py-1 z-50"
          style={{
            background: "var(--gt-surface)",
            border: "1px solid var(--gt-border)",
            borderRadius: "0.375rem",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
          }}
        >
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm transition-colors"
            style={{ color: "var(--gt-t2)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gt-blue)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gt-t2)")}
          >
            {t("account")}
          </Link>
          <div style={{ borderTop: "1px solid var(--gt-border)", margin: "2px 0" }} />
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="block w-full text-left px-3 py-2 text-sm cursor-pointer transition-colors"
            style={{ color: "var(--gt-t2)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gt-blue)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gt-t2)")}
          >
            {t("signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
