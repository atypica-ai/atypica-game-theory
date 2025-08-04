import { Metadata } from "next";
import { getLocale } from "next-intl/server";
import React from "react";
import { GlossaryEN } from "./GlossaryEN";
import { GlossaryZH } from "./GlossaryZH";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Glossary",
  };
}

const GlossaryPage: React.FC = async () => {
  const locale = await getLocale();
  return locale === "zh-CN" ? <GlossaryZH /> : <GlossaryEN />;
};

export default GlossaryPage;
