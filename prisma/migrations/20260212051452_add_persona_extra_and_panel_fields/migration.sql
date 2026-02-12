-- AlterTable
ALTER TABLE "Persona" ADD COLUMN     "extra" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "PersonaPanel" ADD COLUMN     "instruction" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "title" VARCHAR(255) NOT NULL DEFAULT '';
