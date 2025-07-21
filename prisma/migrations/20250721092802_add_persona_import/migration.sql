-- AlterTable
ALTER TABLE "Persona" ADD COLUMN     "personaImportId" INTEGER,
ADD COLUMN     "tier" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PersonaImport" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "attachments" JSONB NOT NULL,
    "analysis" JSONB,
    "extra" JSONB,
    "extraUserChatId" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PersonaImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonaImport_extraUserChatId_key" ON "PersonaImport"("extraUserChatId");

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_personaImportId_fkey" FOREIGN KEY ("personaImportId") REFERENCES "PersonaImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaImport" ADD CONSTRAINT "PersonaImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
