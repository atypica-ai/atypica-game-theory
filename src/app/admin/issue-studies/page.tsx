import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { IssueStudiesPageClient } from "./IssueStudiesPageClient";

interface IssueStudiesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function IssueStudiesPage({ searchParams }: IssueStudiesPageProps) {
  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <IssueStudiesPageClient initialSearchParams={initialSearchParams} />;
}
