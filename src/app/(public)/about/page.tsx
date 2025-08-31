import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import React from "react";
import { AboutEN } from "./AboutEN";
import { AboutZH } from "./AboutZH";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "About atypica.AI - AI-Powered Intelligence for Subjective Reality",
  };
}

const AboutPage: React.FC = async () => {
  const locale = await getLocale();
  return locale === "zh-CN" ? <AboutZH /> : <AboutEN />;
};

export default AboutPage;
