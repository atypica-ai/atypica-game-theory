import { getLocale } from "next-intl/server";
import React from "react";
import { PrivacyEN } from "./PrivacyEN";
import { PrivacyZH } from "./PrivacyZH";

const PrivacyPage: React.FC = async () => {
  const locale = await getLocale();
  return locale === "zh-CN" ? <PrivacyZH /> : <PrivacyEN />;
};

export default PrivacyPage;
