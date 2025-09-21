import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { PaymentHistory } from "./PaymentHistory";

interface PaymentPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PaymentPage({ searchParams }: PaymentPageProps) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <PaymentHistory initialSearchParams={initialSearchParams} />;
}
