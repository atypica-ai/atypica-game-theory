import { getDeployRegion } from "@/lib/request/deployRegion";
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { VALID_LOCALES } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  if (!locale) {
    const [cookieLocale, headerLocale] = await Promise.all([cookies(), headers()]).then(
      ([cookies, headers]) => [cookies.get("locale")?.value, headers.get("x-locale")],
    );
    const defaultLocale = getDeployRegion() === "mainland" ? "zh-CN" : "en-US";
    locale = (cookieLocale || headerLocale || defaultLocale) as (typeof VALID_LOCALES)[number];
  }
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
