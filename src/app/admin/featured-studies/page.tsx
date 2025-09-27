import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { FeaturedStudiesPageClient } from "./FeaturedStudiesPageClient";

// 关闭 SSG，否则 build 环境会读取数据库
export const dynamic = "force-dynamic";

interface FeaturedStudiesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FeaturedStudiesPage({ searchParams }: FeaturedStudiesPageProps) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <FeaturedStudiesPageClient initialSearchParams={initialSearchParams} />;
}