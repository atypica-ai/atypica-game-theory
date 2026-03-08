import authOptions from "@/app/(auth)/authOptions";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale } from "next-intl/server";
import { Suspense } from "react";
import { PulseMarketplaceClient } from "./PulseMarketplaceClient";
import { fetchPulseCategories } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("Pulse");

  return generatePageMetadata({
    title: t("title"),
    description: t("description"),
    locale,
  });
}

async function PulseMarketplacePage() {
  // Fetch categories (public data)
  const categoriesResult = await fetchPulseCategories();
  const categories = categoriesResult.success ? categoriesResult.data : [];

  // Check if user is authenticated (for client-side fetching)
  const session = await getServerSession(authOptions);
  const isAuthenticated = !!session?.user?.id;

  return (
    <PulseMarketplaceClient initialCategories={categories} isAuthenticated={isAuthenticated} />
  );
}

export default async function PulseMarketplacePageWithLoading() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PulseMarketplacePage />
    </Suspense>
  );
}
