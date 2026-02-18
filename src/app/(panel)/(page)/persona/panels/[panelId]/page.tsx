import authOptions from "@/app/(auth)/authOptions";
import {
  fetchPersonaPanelById,
  fetchResearchProjectsByPanelId,
} from "@/app/(panel)/(page)/persona/panels/actions";
import { Forbidden } from "@/components/Forbidden";
import { NotFound } from "@/components/NotFound";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PanelDetailClient } from "./PanelDetailClient";

// generateMetadata needs database access
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ panelId: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("PersonaPanel");
  const { panelId } = await params;
  const result = await fetchPersonaPanelById(parseInt(panelId, 10));
  if (!result.success) {
    return {};
  }
  const { title } = result.data;
  return generatePageMetadata({
    title: `${t("title")} - ${title || t("panelId", { id: panelId })}`,
    description: t("subtitle"),
    locale,
  });
}

async function PanelDetailPage({ panelId }: { panelId: number }) {
  const [panelResult, projectsResult] = await Promise.all([
    fetchPersonaPanelById(panelId),
    fetchResearchProjectsByPanelId(panelId),
  ]);

  if (!panelResult.success) {
    if (panelResult.code === "forbidden") {
      return <Forbidden />;
    }
    return <NotFound />;
  }

  return (
    <PanelDetailClient
      panel={panelResult.data}
      projects={projectsResult.success ? projectsResult.data : []}
    />
  );
}

export default async function PanelDetailPageWithLoading({
  params,
}: {
  params: Promise<{ panelId: string }>;
}) {
  const { panelId } = await params;

  // Check authentication before rendering to avoid client error flash
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    const callbackUrl = `/persona/panels/${panelId}`;
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PanelDetailPage panelId={parseInt(panelId, 10)} />
    </Suspense>
  );
}
