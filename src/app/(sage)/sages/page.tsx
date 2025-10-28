import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { forbidden } from "next/navigation";
import { Suspense } from "react";
import { listMySages } from "../actions";
import { SagesListClient } from "./SagesListClient";

export async function generateMetadata() {
  const t = await getTranslations("Sage.list");
  return { title: t("title") };
}

async function SagesListPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    forbidden();
  }

  const result = await listMySages();
  const sages = result.success ? result.data : [];

  return <SagesListClient sages={sages} />;
}

export default async function SagesListPageWithLoading() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SagesListPage />
    </Suspense>
  );
}
