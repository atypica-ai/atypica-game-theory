import authOptions from "@/app/(auth)/authOptions";
import { Forbidden } from "@/components/Forbidden";
import { NotFound } from "@/components/NotFound";
import { PageLoadingFallback } from "@/components/PageLoadingFallback";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { Suspense } from "react";
import { PersonaImportView } from "./PersonaImportView";

async function PersonaImportDetailPage({
  params,
}: {
  params: Promise<{
    personaImportId: string;
  }>;
}) {
  const id = parseInt((await params).personaImportId);
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    // forbidden(); // Cannot use forbidden() inside Suspense boundary - it throws an error that Suspense catches, causing page interaction issues
    // Instead, return a Forbidden component directly
    return <Forbidden />;
  }
  const userId = session.user.id;

  const personaImport = await prisma.personaImport.findUnique({
    where: { id, userId },
  });

  if (!personaImport) {
    // notFound(); // Cannot use notFound() inside Suspense boundary - it throws an error that Suspense catches, causing page interaction issues
    // Instead, return a NotFound component directly
    return <NotFound />;
  }

  // Fetch associated personas
  const personas = await prisma.persona.findMany({
    where: { personaImportId: id },
    orderBy: { createdAt: "asc" },
  });

  return <PersonaImportView personaImport={personaImport} personas={personas} />;
}

export default async function PersonaImportDetailPageWithLoading({
  params,
}: {
  params: Promise<{ personaImportId: string }>;
}) {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <PersonaImportDetailPage params={params} />
    </Suspense>
  );
}
