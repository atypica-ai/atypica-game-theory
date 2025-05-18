/*
  Warnings:

  - You are about to drop the column `interviewerPrompt` on the `AnalystInterview` table. All the data in the column will be lost.
  - You are about to drop the column `personaPrompt` on the `AnalystInterview` table. All the data in the column will be lost.
  - You are about to drop the `UserAnalyst` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `brief` on table `Analyst` required. This step will fail if there are existing NULL values in that column.
  - Made the column `instruction` on table `AnalystInterview` required. This step will fail if there are existing NULL values in that column.
  - Made the column `instruction` on table `AnalystReport` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "UserAnalyst" DROP CONSTRAINT "UserAnalyst_analystId_fkey";

-- DropForeignKey
ALTER TABLE "UserAnalyst" DROP CONSTRAINT "UserAnalyst_userId_fkey";

-- AlterTable
ALTER TABLE "Analyst" ALTER COLUMN "brief" SET NOT NULL;

-- AlterTable
ALTER TABLE "AnalystInterview" DROP COLUMN "interviewerPrompt",
DROP COLUMN "personaPrompt",
ALTER COLUMN "instruction" SET NOT NULL;

-- AlterTable
ALTER TABLE "AnalystReport" ALTER COLUMN "instruction" SET NOT NULL;

-- DropTable
DROP TABLE "UserAnalyst";
