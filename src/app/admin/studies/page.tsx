import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { AdminStudiesPageClient } from "./AdminStudiesPageClient";

interface FeaturedStudiesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FeaturedStudiesPage({ searchParams }: FeaturedStudiesPageProps) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);
  return <AdminStudiesPageClient initialSearchParams={initialSearchParams} />;
}
