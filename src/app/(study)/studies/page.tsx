import authOptions from "@/app/(auth)/authOptions";
import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { StudyListPageClient } from "./StudyListPageClient";

interface StudiesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function StudiesPage({ searchParams }: StudiesPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/studies`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <StudyListPageClient initialSearchParams={initialSearchParams} />;
}
