import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { AnalystReportsPageClient } from "./AnalystReportsPageClient";

// 关闭 SSG，否则 build 环境会读取数据库
export const dynamic = "force-dynamic";

interface AnalystReportsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AnalystReportsPage({ searchParams }: AnalystReportsPageProps) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <AnalystReportsPageClient initialSearchParams={initialSearchParams} />;
}