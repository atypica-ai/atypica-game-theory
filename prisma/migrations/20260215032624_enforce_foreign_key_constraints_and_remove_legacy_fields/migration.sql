/*
  Warnings:

  - You are about to drop the column `analystId` on the `AnalystInterview` table. All the data in the column will be lost.
  - You are about to drop the column `analystId` on the `AnalystPodcast` table. All the data in the column will be lost.
  - You are about to drop the column `analystId` on the `AnalystReport` table. All the data in the column will be lost.
  - Made the column `studyUserChatId` on table `Analyst` required. This step will fail if there are existing NULL values in that column.
  - Made the column `personaPanelId` on table `AnalystInterview` required. This step will fail if there are existing NULL values in that column.
  - Made the column `personaPanelId` on table `DiscussionTimeline` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userChatId` on table `InterviewSession` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Analyst" DROP CONSTRAINT "Analyst_studyUserChatId_fkey";

-- DropForeignKey
ALTER TABLE "AnalystInterview" DROP CONSTRAINT "AnalystInterview_personaId_fkey";

-- DropForeignKey
ALTER TABLE "AnalystInterview" DROP CONSTRAINT "AnalystInterview_personaPanelId_fkey";

-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_userChatId_fkey";

-- DropForeignKey
ALTER TABLE "ChatStatistics" DROP CONSTRAINT "ChatStatistics_userChatId_fkey";

-- DropForeignKey
ALTER TABLE "DiscussionTimeline" DROP CONSTRAINT "DiscussionTimeline_personaPanelId_fkey";

-- DropForeignKey
ALTER TABLE "InterviewReport" DROP CONSTRAINT "InterviewReport_projectId_fkey";

-- DropForeignKey
ALTER TABLE "InterviewSession" DROP CONSTRAINT "InterviewSession_projectId_fkey";

-- DropForeignKey
ALTER TABLE "InterviewSession" DROP CONSTRAINT "InterviewSession_userChatId_fkey";

-- DropForeignKey
ALTER TABLE "Persona" DROP CONSTRAINT "Persona_personaImportId_fkey";

-- DropForeignKey
ALTER TABLE "SageChat" DROP CONSTRAINT "SageChat_userChatId_fkey";

-- DropForeignKey
ALTER TABLE "SageInterview" DROP CONSTRAINT "SageInterview_userChatId_fkey";

-- DropForeignKey
ALTER TABLE "UserPersonaChatRelation" DROP CONSTRAINT "UserPersonaChatRelation_userChatId_fkey";

-- AlterTable
ALTER TABLE "Analyst" ALTER COLUMN "studyUserChatId" SET NOT NULL;

-- AlterTable
ALTER TABLE "AnalystInterview" DROP COLUMN "analystId",
ALTER COLUMN "personaId" DROP NOT NULL,
ALTER COLUMN "personaPanelId" SET NOT NULL;

-- AlterTable
ALTER TABLE "AnalystPodcast" DROP COLUMN "analystId";

-- AlterTable
ALTER TABLE "AnalystReport" DROP COLUMN "analystId";

-- AlterTable
ALTER TABLE "DiscussionTimeline" ALTER COLUMN "personaPanelId" SET NOT NULL;

-- AlterTable
ALTER TABLE "InterviewSession" ALTER COLUMN "userChatId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_personaImportId_fkey" FOREIGN KEY ("personaImportId") REFERENCES "PersonaImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analyst" ADD CONSTRAINT "Analyst_studyUserChatId_fkey" FOREIGN KEY ("studyUserChatId") REFERENCES "UserChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userChatId_fkey" FOREIGN KEY ("userChatId") REFERENCES "UserChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatStatistics" ADD CONSTRAINT "ChatStatistics_userChatId_fkey" FOREIGN KEY ("userChatId") REFERENCES "UserChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPersonaChatRelation" ADD CONSTRAINT "UserPersonaChatRelation_userChatId_fkey" FOREIGN KEY ("userChatId") REFERENCES "UserChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "InterviewProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_userChatId_fkey" FOREIGN KEY ("userChatId") REFERENCES "UserChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewReport" ADD CONSTRAINT "InterviewReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "InterviewProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalystInterview" ADD CONSTRAINT "AnalystInterview_personaPanelId_fkey" FOREIGN KEY ("personaPanelId") REFERENCES "PersonaPanel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalystInterview" ADD CONSTRAINT "AnalystInterview_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionTimeline" ADD CONSTRAINT "DiscussionTimeline_personaPanelId_fkey" FOREIGN KEY ("personaPanelId") REFERENCES "PersonaPanel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageChat" ADD CONSTRAINT "SageChat_userChatId_fkey" FOREIGN KEY ("userChatId") REFERENCES "UserChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageInterview" ADD CONSTRAINT "SageInterview_userChatId_fkey" FOREIGN KEY ("userChatId") REFERENCES "UserChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
