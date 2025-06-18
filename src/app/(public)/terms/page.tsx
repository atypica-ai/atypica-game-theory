import { getLocale } from "next-intl/server";
import React from "react";
import { TermsEN } from "./TermsEN";
import { TermsZH } from "./TermsZH";

const TermsPage: React.FC = async () => {
  const locale = await getLocale();
  return locale === "zh-CN" ? <TermsZH /> : <TermsEN />;
};

export default TermsPage;
