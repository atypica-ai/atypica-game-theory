import { getRequestOrigin } from "@/lib/request/headers";
import { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await getRequestOrigin();
  return [
    { url: `${origin}/`, lastModified: new Date() },
    { url: `${origin}/game/new`, lastModified: new Date() },
  ];
}
