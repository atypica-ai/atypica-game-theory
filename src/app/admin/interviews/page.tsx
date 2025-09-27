import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { InterviewsPageClient } from "./InterviewsPageClient";

interface InterviewsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function InterviewsPage({ searchParams }: InterviewsPageProps) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <InterviewsPageClient initialSearchParams={initialSearchParams} />;
}