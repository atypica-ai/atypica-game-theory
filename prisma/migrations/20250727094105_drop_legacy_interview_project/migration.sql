/*
  Warnings:

  - You are about to drop the `InterviewProjectLegacy` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InterviewSessionLegacy` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "InterviewProjectLegacy" DROP CONSTRAINT "InterviewProjectLegacy_userId_fkey";

-- DropForeignKey
ALTER TABLE "InterviewSessionLegacy" DROP CONSTRAINT "InterviewSessionLegacy_projectId_fkey";

-- DropForeignKey
ALTER TABLE "InterviewSessionLegacy" DROP CONSTRAINT "InterviewSessionLegacy_userChatId_fkey";

-- DropTable
DROP TABLE "InterviewProjectLegacy";

-- DropTable
DROP TABLE "InterviewSessionLegacy";

-- DropEnum
DROP TYPE "InterviewSessionKind";

-- DropEnum
DROP TYPE "InterviewSessionStatus";
