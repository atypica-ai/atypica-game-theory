import authOptions from "@/app/(auth)/authOptions";
import { PersonaImportAnalysis } from "@/app/(persona)/types";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { PersonaImportExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { forbidden, notFound } from "next/navigation";
import { Suspense } from "react";
import { PersonaImportView } from "./PersonaImportView";

async function PersonaImportDetailPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const id = parseInt((await params).id);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    forbidden();
  }
  const userId = session.user.id;

  const personaImport = await prisma.personaImport.findUnique({
    where: { id, userId },
  });

  if (!personaImport) {
    notFound();
  }

  // Fetch associated personas
  const personas = await prisma.persona.findMany({
    where: { personaImportId: id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <PersonaImportView
      personaImport={{
        ...personaImport,
        analysis: personaImport.analysis as unknown as Partial<PersonaImportAnalysis> | null,
        extra: personaImport.extra as unknown as PersonaImportExtra,
      }}
      personas={personas}
    />
  );
}

export default async function PersonaImportDetailPageWithLoading({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PersonaImportDetailPage params={params} />
    </Suspense>
  );
}
