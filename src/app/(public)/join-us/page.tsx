import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import React from "react";
import { JoinUsEN } from "./JoinUsEN";
import { JoinUsZH } from "./JoinUsZH";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Join Us - atypica.AI Careers",
  };
}

const JoinUsPage: React.FC = async () => {
  const locale = await getLocale();
  return locale === "zh-CN" ? <JoinUsZH /> : <JoinUsEN />;
};

export default JoinUsPage;
