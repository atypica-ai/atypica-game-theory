import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { CreateSageForm } from "./CreateSageForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Sage.create");
  return { title: t("title") };
}

async function SageCreatePage() {
  return <CreateSageForm />;
}

export default async function SageCreatePageWithLoading() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SageCreatePage />
    </Suspense>
  );
}
