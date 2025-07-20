import authOptions from "@/app/(auth)/authOptions";
import { PersonaImportAnalysis } from "@/app/(persona)/types";
import { PersonaImportExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { getServerSession } from "next-auth";
import { forbidden, notFound } from "next/navigation";
import { PersonaImportView } from "./PersonaImportView";

interface PersonaImportPageProps {
  params: {
    id: string;
  };
}

export default async function PersonaImportDetailPage({
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

  return (
    <PersonaImportView
      personaImport={{
        ...personaImport,
        analysis: personaImport.analysis as unknown as Partial<PersonaImportAnalysis> | null,
        extra: personaImport.extra as unknown as PersonaImportExtra,
      }}
    />
  );
}
