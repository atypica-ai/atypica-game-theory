import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import React from "react";
import { PrivacyEN } from "./PrivacyEN";
import { PrivacyZH } from "./PrivacyZH";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PrivacyPage");
  return {
    title: `${t("title")} | atypica.AI`,
    description: t("description"),
  };
}

const PrivacyPage: React.FC = async () => {
  const locale = await getLocale();
  return locale === "zh-CN" ? <PrivacyZH /> : <PrivacyEN />;
};

export default PrivacyPage;
