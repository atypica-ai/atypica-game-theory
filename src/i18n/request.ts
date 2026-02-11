import { getDeployRegion } from "@/lib/request/deployRegion";
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { VALID_LOCALES } from "./routing";

const getMessages = async (locale: string) => {
  const [
    messages,
    authMessages,
    interviewProjectMessages,
    personaMessages,
    sageMessages,
    studyMessages,
    publicMessages,
    solutionsMessages,
    accountMessages,
    teamMessages,
    universalMessages,
  ] = await Promise.all([
    import(`../../messages/${locale}.json`),
    import(`../app/(auth)/messages/${locale}.json`),
    import(`../app/(interviewProject)/messages/${locale}.json`),
    import(`../app/(persona)/messages/${locale}.json`),
    import(`../app/(sage)/messages/${locale}.json`),
    import(`../app/(study)/messages/${locale}.json`),
    import(`../app/(public)/messages/${locale}.json`),
    import(`../app/(public)/(solutions)/messages/${locale}.json`),
    import(`../app/account/messages/${locale}.json`),
    import(`../app/team/messages/${locale}.json`),
    import(`../app/(universal)/messages/${locale}.json`),
  ]);
  return {
    ...messages.default,
    ...authMessages.default,
    ...interviewProjectMessages.default,
    ...personaMessages.default,
    ...sageMessages.default,
    ...studyMessages.default,
    ...publicMessages.default,
    ...solutionsMessages.default,
    ...accountMessages.default,
    ...teamMessages.default,
    ...universalMessages.default,
  };
};

export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    // Get locale from cookie or header
    const [cookieLocale, headerLocale] = await Promise.all([cookies(), headers()]).then(
      ([cookies, headers]) => [cookies.get("locale")?.value, headers.get("x-locale")],
    );
    const defaultLocale = getDeployRegion() === "mainland" ? "zh-CN" : "en-US";
    locale = (cookieLocale || headerLocale || defaultLocale) as (typeof VALID_LOCALES)[number];
  }
  return {
    locale,
    messages: await getMessages(locale),
  };
});
