import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { parseServerSearchParams } from "@/hooks/use-list-query-params.server";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PersonasListClient } from "./PersonasListClient";

interface PersonasPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function PersonasPage({ searchParams }: PersonasPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = "/personas";
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const params = await searchParams;
  const initialSearchParams = parseServerSearchParams(params);

  return <PersonasListClient initialSearchParams={initialSearchParams} />;
}

export default async function PersonasPageWithLoading(props: PersonasPageProps) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PersonasPage searchParams={props.searchParams} />
    </Suspense>
  );
}
