import { getRequestOrigin } from "@/lib/request/headers";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteOrigin = await getRequestOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/game/*", "/games", "/play/*", "/crucible"],
        disallow: ["/api", "/auth", "/_next", "/_public"],
        crawlDelay: 1,
      },
    ],
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}
