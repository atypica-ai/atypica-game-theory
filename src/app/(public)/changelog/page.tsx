import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import React from "react";
import { ChangelogEN } from "./ChangelogEN";
import { ChangelogZH } from "./ChangelogZH";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Changelog",
  };
}

const ChangelogPage: React.FC = async () => {
  const locale = await getLocale();
  return locale === "zh-CN" ? <ChangelogZH /> : <ChangelogEN />;
};

export default ChangelogPage;
