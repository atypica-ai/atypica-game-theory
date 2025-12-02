import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Suspense } from "react";
import { SageDetailPageClient } from "./SageDetailPageClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sageToken: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const { sageToken } = await params;

  // Only need name for metadata
  const sage = await prisma.sage.findUnique({
    where: { token: sageToken },
    select: { name: true, domain: true },
  });

  if (!sage) {
    return {};
  }

  return generatePageMetadata({
    title: sage.name,
    description: sage.domain,
    locale,
  });
}

// Sage data is available via Context in Client Component
export default function SageDetailPage() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <SageDetailPageClient />
    </Suspense>
  );
}
