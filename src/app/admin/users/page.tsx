import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { UsersPageClient } from "./UsersPageClient";

interface UsersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <UsersPageClient initialSearchParams={initialSearchParams} />;
}
