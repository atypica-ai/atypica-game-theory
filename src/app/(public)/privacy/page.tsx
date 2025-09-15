import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import React from "react";
import { PrivacyEN } from "./PrivacyEN";
import { PrivacyZH } from "./PrivacyZH";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PrivacyPage");
  const locale = await getLocale();
  return generatePageMetadata({
    title: `${t("title")}`,
    description: t("description"),
    locale,
  });
}

const PrivacyPage: React.FC = async () => {
  const locale = await getLocale();
  return locale === "zh-CN" ? <PrivacyZH /> : <PrivacyEN />;
};

export default PrivacyPage;
