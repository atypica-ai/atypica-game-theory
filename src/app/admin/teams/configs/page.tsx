import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { TeamConfigsPageClient } from "./TeamConfigsPageClient";

interface TeamConfigsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TeamConfigsPage({ searchParams }: TeamConfigsPageProps) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <TeamConfigsPageClient initialSearchParams={initialSearchParams} />;
}
