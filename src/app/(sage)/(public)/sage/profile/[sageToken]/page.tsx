import authOptions from "@/app/(auth)/authOptions";
import { getSageByToken } from "@/app/(sage)/lib";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PublicSageView } from "./PublicSageView";

async function PublicSagePage({
  params,
}: {
  params: Promise<{
    sageToken: string;
  }>;
}) {
  const sageToken = (await params).sageToken;
  const session = await getServerSession(authOptions);

  const result = await getSageByToken(sageToken);

  if (!result) {
    notFound();
  }

  const { sage, memoryDocument } = result;

  const isOwner = !!(session?.user && sage.userId === session.user.id);

  // Check if Memory Document is ready
  if (!memoryDocument) {
    notFound();
  }

  return (
    <PublicSageView
      sage={sage}
      isOwner={isOwner}
      isAuthenticated={!!session?.user}
    />
  );
}

export default async function PublicSagePageWithLoading({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PublicSagePage params={params} />
    </Suspense>
  );
}
