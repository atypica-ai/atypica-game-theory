import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { MemoryPageClient } from "./MemoryPageClient";

interface MemoryPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MemoryPage({ searchParams }: MemoryPageProps) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <MemoryPageClient initialSearchParams={initialSearchParams} />;
}
