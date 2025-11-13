import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { TokenConsumptionPageClient } from "./TokenConsumptionPageClient";

interface TokenConsumptionPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TokenConsumptionPage({ searchParams }: TokenConsumptionPageProps) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <TokenConsumptionPageClient initialSearchParams={initialSearchParams} />;
}
