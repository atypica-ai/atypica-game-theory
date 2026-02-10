import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { SearchPageClient } from "./SearchPageClient";

interface SearchPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <SearchPageClient initialSearchParams={initialSearchParams} />;
}
