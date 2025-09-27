import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { EnterpriseLeadsPageClient } from "./EnterpriseLeadsPageClient";

interface EnterpriseLeadsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EnterpriseLeadsPage({ searchParams }: EnterpriseLeadsPageProps) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <EnterpriseLeadsPageClient initialSearchParams={initialSearchParams} />;
}