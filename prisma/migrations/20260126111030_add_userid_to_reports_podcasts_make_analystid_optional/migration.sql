-- DropForeignKey
ALTER TABLE "AnalystInterview" DROP CONSTRAINT "AnalystInterview_analystId_fkey";

-- DropForeignKey
ALTER TABLE "AnalystPodcast" DROP CONSTRAINT "AnalystPodcast_analystId_fkey";

-- DropForeignKey
ALTER TABLE "AnalystReport" DROP CONSTRAINT "AnalystReport_analystId_fkey";

-- DropIndex
DROP INDEX "AnalystInterview_analystId_personaId_key";

-- AlterTable
ALTER TABLE "AnalystInterview" ADD COLUMN     "personaPanelId" INTEGER,
ALTER COLUMN "analystId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AnalystPodcast" ADD COLUMN     "userId" INTEGER,
ALTER COLUMN "analystId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AnalystReport" ADD COLUMN     "userId" INTEGER,
ALTER COLUMN "analystId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "UserChat" ADD COLUMN     "context" JSONB NOT NULL DEFAULT '{}';

-- AddForeignKey
ALTER TABLE "AnalystReport" ADD CONSTRAINT "AnalystReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalystReport" ADD CONSTRAINT "AnalystReport_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES "Analyst"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalystPodcast" ADD CONSTRAINT "AnalystPodcast_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalystPodcast" ADD CONSTRAINT "AnalystPodcast_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES "Analyst"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalystInterview" ADD CONSTRAINT "AnalystInterview_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES "Analyst"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalystInterview" ADD CONSTRAINT "AnalystInterview_personaPanelId_fkey" FOREIGN KEY ("personaPanelId") REFERENCES "PersonaPanel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
