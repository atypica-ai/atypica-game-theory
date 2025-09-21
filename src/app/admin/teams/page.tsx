import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { TeamsPageClient } from "./TeamsPageClient";

interface TeamsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TeamsPage({ searchParams }: TeamsPageProps) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <TeamsPageClient initialSearchParams={initialSearchParams} />;
}
