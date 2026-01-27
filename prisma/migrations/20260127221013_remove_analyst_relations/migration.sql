/*
  Warnings:

  - Made the column `userId` on table `AnalystPodcast` required. This step will fail if there are existing NULL values in that column.
  - Made the column `userId` on table `AnalystReport` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "AnalystInterview" DROP CONSTRAINT "AnalystInterview_analystId_fkey";

-- DropForeignKey
ALTER TABLE "AnalystPodcast" DROP CONSTRAINT "AnalystPodcast_analystId_fkey";

-- DropForeignKey
ALTER TABLE "AnalystPodcast" DROP CONSTRAINT "AnalystPodcast_userId_fkey";

-- DropForeignKey
ALTER TABLE "AnalystReport" DROP CONSTRAINT "AnalystReport_analystId_fkey";

-- DropForeignKey
ALTER TABLE "AnalystReport" DROP CONSTRAINT "AnalystReport_userId_fkey";

-- DropIndex
DROP INDEX "AnalystPodcast_analystId_idx";

-- DropIndex
DROP INDEX "AnalystReport_analystId_idx";

-- AlterTable
ALTER TABLE "AnalystPodcast" ALTER COLUMN "userId" SET NOT NULL;

-- AlterTable
ALTER TABLE "AnalystReport" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "AnalystInterview_personaPanelId_idx" ON "AnalystInterview"("personaPanelId");

-- AddForeignKey
ALTER TABLE "AnalystReport" ADD CONSTRAINT "AnalystReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalystPodcast" ADD CONSTRAINT "AnalystPodcast_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
