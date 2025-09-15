import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import React from "react";
import { TermsEN } from "./TermsEN";
import { TermsZH } from "./TermsZH";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TermsPage");
  const locale = await getLocale();
  return generatePageMetadata({
    title: `${t("title")}`,
    description: t("description"),
    locale,
  });
}

const TermsPage: React.FC = async () => {
  const locale = await getLocale();
  return locale === "zh-CN" ? <TermsZH /> : <TermsEN />;
};

export default TermsPage;
