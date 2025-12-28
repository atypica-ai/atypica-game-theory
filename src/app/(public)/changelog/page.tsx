import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import React from "react";
import { Changelog } from "./Changelog";
import { changelogDataEN, changelogFooterEN } from "./changelog-data-en";
import { changelogDataZH, changelogFooterZH } from "./changelog-data-zh";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const title = locale === "zh-CN" ? "更新日志" : "Changelog";
  const description =
    locale === "zh-CN"
      ? "查看 atypica.AI 最新功能更新和改进。"
      : "View the latest feature updates and improvements for atypica.AI.";

  return generatePageMetadata({
    title,
    description,
    locale,
  });
}

const ChangelogPage: React.FC = async () => {
  const locale = await getLocale();
  const isZH = locale === "zh-CN";

  return (
    <Changelog
      data={isZH ? changelogDataZH : changelogDataEN}
      footer={isZH ? changelogFooterZH : changelogFooterEN}
      title={isZH ? "atypica.AI 更新日志" : "atypica.AI Changelog"}
    />
  );
};

export default ChangelogPage;
