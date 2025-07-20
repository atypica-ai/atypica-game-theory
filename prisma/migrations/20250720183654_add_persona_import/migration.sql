-- AlterTable
ALTER TABLE "Persona" ADD COLUMN     "personaImportId" INTEGER;

-- CreateTable
CREATE TABLE "PersonaImport" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "attachments" JSONB NOT NULL,
    "summary" TEXT,
    "analysis" JSONB,
    "extra" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PersonaImport_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_personaImportId_fkey" FOREIGN KEY ("personaImportId") REFERENCES "PersonaImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaImport" ADD CONSTRAINT "PersonaImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
