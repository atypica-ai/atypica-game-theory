import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { AnalystReportsPageClient } from "./AnalystReportsPageClient";

interface AnalystReportsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AnalystReportsPage({ searchParams }: AnalystReportsPageProps) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <AnalystReportsPageClient initialSearchParams={initialSearchParams} />;
}
