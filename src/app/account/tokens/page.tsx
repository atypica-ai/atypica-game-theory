import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { TokensHistory } from "./TokensHistory";

interface TokensPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TokensPage({ searchParams }: TokensPageProps) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <TokensHistory initialSearchParams={initialSearchParams} />;
}
