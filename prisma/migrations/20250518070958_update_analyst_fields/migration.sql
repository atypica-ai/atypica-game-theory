-- AlterTable
ALTER TABLE "Analyst" ADD COLUMN     "brief" TEXT,
ADD COLUMN     "userId" INTEGER;

-- AlterTable
ALTER TABLE "AnalystInterview" ADD COLUMN     "instruction" TEXT,
ALTER COLUMN "personaPrompt" DROP NOT NULL,
ALTER COLUMN "interviewerPrompt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "AnalystReport" ADD COLUMN     "instruction" TEXT;

-- AddForeignKey
ALTER TABLE "Analyst" ADD CONSTRAINT "Analyst_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
