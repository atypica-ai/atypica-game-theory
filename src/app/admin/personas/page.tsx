import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { PersonasPageClient } from "./PersonasPageClient";

// 关闭 SSG，否则 build 环境会读取数据库
export const dynamic = "force-dynamic";

interface PersonasPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PersonasPage({ searchParams }: PersonasPageProps) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <PersonasPageClient initialSearchParams={initialSearchParams} />;
}
