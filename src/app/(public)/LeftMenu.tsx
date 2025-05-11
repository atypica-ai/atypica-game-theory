"use client";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function LeftMenus() {
  const { data: session } = useSession();
  const t = useTranslations("Components.GlobalHeader");
  return (
    <>
      <Link href="/pricing">{t("pricing")}</Link>
      {session?.user ? (
        <Link href="/study">
          <span>{t("myStudies")}</span>
        </Link>
      ) : (
        <Link href="/featured-studies">
          <span>{t("featuredStudies")}</span>
        </Link>
      )}
    </>
  );
}
