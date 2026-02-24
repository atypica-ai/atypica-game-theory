import { FitToViewport } from "@/components/layout/FitToViewport";
import { generatePageMetadata } from "@/lib/request/metadata";
import { prisma } from "@/prisma/prisma";
import { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ResearchWizardClient } from "./ResearchWizardClient";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PersonaPanel.ResearchWizard");
  const locale = await getLocale();
  return generatePageMetadata({
    title: t("title"),
    locale,
  });
}

export default async function NewStudyPage({ params }: { params: Promise<{ panelId: string }> }) {
  const { panelId } = await params;
  const panelIdNum = parseInt(panelId, 10);

  if (isNaN(panelIdNum)) {
    notFound();
  }

  // Load panel with persona details for agent context
  const panel = await prisma.personaPanel.findUnique({
    where: { id: panelIdNum },
    select: {
      id: true,
      title: true,
      personaIds: true,
    },
  });

  if (!panel) {
    notFound();
  }

  // Load persona names for agent instruction
  const personas = await prisma.persona.findMany({
    where: { id: { in: panel.personaIds } },
    select: { id: true, name: true },
  });

  return (
    <FitToViewport>
      <ResearchWizardClient
        panelId={panel.id}
        panelTitle={panel.title}
        personas={personas}
      />
    </FitToViewport>
  );
}
