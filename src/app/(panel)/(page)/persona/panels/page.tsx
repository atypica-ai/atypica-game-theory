import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PersonaPanelsListClient } from "./PersonaPanelsListClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PersonaPanel");
  const locale = await getLocale();
  return generatePageMetadata({
    title: t("title"),
    description: t("subtitle"),
    locale,
  });
}

async function PersonaPanelsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = "/persona/panels";
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return <PersonaPanelsListClient />;
}

export default async function PersonaPanelsPageWithLoading() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PersonaPanelsPage />
    </Suspense>
  );
}
