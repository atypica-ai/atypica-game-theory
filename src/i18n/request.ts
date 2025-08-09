import { getDeployRegion } from "@/lib/request/deployRegion";
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { locales } from "./routing";

const getMessages = async (locale: string) => {
  const [
    messages,
    authMessages,
    interviewProjectMessages,
    personaMessages,
    publicMessages,
    teamMessages,
  ] = await Promise.all([
    import(`../../messages/${locale}.json`),
    import(`../app/(auth)/messages/${locale}.json`),
    import(`../app/(interviewProject)/messages/${locale}.json`),
    import(`../app/(persona)/messages/${locale}.json`),
    import(`../app/(public)/messages/${locale}.json`),
    import(`../app/team/messages/${locale}.json`),
  ]);
  return {
    ...messages.default,
    ...authMessages.default,
    ...interviewProjectMessages.default,
    ...personaMessages.default,
    ...publicMessages.default,
    ...teamMessages.default,
  };
};

export default getRequestConfig(async () => {
  // Get locale from cookie or header
  const [cookieLocale, headerLocale] = await Promise.all([cookies(), headers()]).then(
    ([cookies, headers]) => [cookies.get("locale")?.value, headers.get("x-locale")],
  );
  const defaultLocale = getDeployRegion() === "mainland" ? "zh-CN" : "en-US";
  const locale = (cookieLocale || headerLocale || defaultLocale) as (typeof locales)[number];
  return {
    locale,
    messages: await getMessages(locale),
  };
});
