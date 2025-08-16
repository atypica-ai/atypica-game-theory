import { getRequestOrigin } from "@/lib/request/headers";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteOrigin = await getRequestOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/pricing",
          "/newstudy",
          "/persona",
          "/interview",
          "/featured-studies",
          "/about",
          "/changelog",
          "/persona-simulation",
          "/privacy",
          "/terms",
        ],
        disallow: [
          "/admin",
          "/api",
          "/auth",
          "/account",
          "/studies",
          "/payment",
          "/maintenance",
          "/status",
          "/_next",
          "/_public",
          "/_pages",
        ],
        crawlDelay: 1,
      },
    ],
    sitemap: `${siteOrigin}/sitemap.xml`,
  };
}
