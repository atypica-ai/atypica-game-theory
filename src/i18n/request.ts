import { getDeployRegion } from "@/lib/deployRegion";
import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export default getRequestConfig(async () => {
  // Get locale from cookie or header
  const [cookieLocale, headerLocale] = await Promise.all([cookies(), headers()]).then(
    ([cookies, headers]) => [cookies.get("locale")?.value, headers.get("x-locale")],
  );
  const defaultLocale = getDeployRegion() === "global" ? "en-US" : "zh-CN";
  const locale = cookieLocale || headerLocale || defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
