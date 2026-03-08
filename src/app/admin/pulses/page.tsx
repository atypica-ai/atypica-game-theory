import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { PulsesPageClient } from "./PulsesPageClient";

export default async function PulsesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);
  return <PulsesPageClient initialSearchParams={initialSearchParams} />;
}
