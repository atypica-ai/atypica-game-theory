import { fetchPersonaWithDetails } from "@/app/(persona)/actions";
import { generatePageMetadata } from "@/lib/request/metadata";
import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { PersonaDetailClient } from "./PersonaDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ personaId: string }>;
}): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("PersonaImport.personaDetails");
  const personaId = parseInt((await params).personaId, 10);

  if (isNaN(personaId)) {
    return {};
  }

  const result = await fetchPersonaWithDetails(personaId);

  if (!result.success) {
    return {};
  }

  const { persona } = result.data;
  return generatePageMetadata({
    title: `${t("title")} - ${persona.name}`,
    description: `${t("description")} - ${persona.name}`,
    locale,
  });
}

export default async function PersonaDetailPage({
  params,
}: {
  params: Promise<{ personaId: string }>;
}) {
  const personaId = parseInt((await params).personaId, 10);

  if (isNaN(personaId)) {
    notFound();
  }

  const result = await fetchPersonaWithDetails(personaId);

  if (!result.success) {
    // Gracefully handle not_found, unauthorized, forbidden without leaking info
    notFound();
  }

  const { persona, analysis, personaImportId } = result.data;

  return (
    <PersonaDetailClient persona={persona} analysis={analysis} personaImportId={personaImportId} />
  );
}
