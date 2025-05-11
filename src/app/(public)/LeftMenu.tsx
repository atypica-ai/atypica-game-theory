"use client";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function LeftMenus() {
  const { data: session } = useSession();
  const t = useTranslations("Components.GlobalHeader");
  return (
    <>
      <Link href="/pricing" className="text-sm font-normal">
        {t("pricing")}
      </Link>
      <Link href="/changelog" className="text-sm font-normal" target="_blank">
        {t("changelog")}
      </Link>
      <Link href="/about" className="text-sm font-normal" target="_blank">
        {t("about")}
      </Link>
      {session?.user ? (
        <Link href="/study" className="text-sm font-normal">
          <span>{t("myStudies")}</span>
        </Link>
      ) : null}
      {/* <Link href="/featured-studies" className="text-sm font-normal">
        <span>{t("featuredStudies")}</span>
      </Link> */}
    </>
  );
}
