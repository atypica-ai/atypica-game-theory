import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { PaymentsPageClient } from "./PaymentsPageClient";

interface PaymentsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <PaymentsPageClient initialSearchParams={initialSearchParams} />;
}
