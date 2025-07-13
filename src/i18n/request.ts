import { getDeployRegion } from "@/lib/request/deployRegion";
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { locales } from "./routing";

export default getRequestConfig(async () => {
  // Get locale from cookie or header
  const [cookieLocale, headerLocale] = await Promise.all([cookies(), headers()]).then(
    ([cookies, headers]) => [cookies.get("locale")?.value, headers.get("x-locale")],
  );
  const defaultLocale = getDeployRegion() === "mainland" ? "zh-CN" : "en-US";
  const locale = (cookieLocale || headerLocale || defaultLocale) as (typeof locales)[number];
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
