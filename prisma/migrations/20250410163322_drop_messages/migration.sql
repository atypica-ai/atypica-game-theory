/*
  Warnings:

  - You are about to drop the column `interviewToken` on the `AnalystInterview` table. All the data in the column will be lost.
  - You are about to drop the column `messages` on the `AnalystInterview` table. All the data in the column will be lost.
  - You are about to drop the column `messages` on the `UserChat` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `AnalystInterview` DROP COLUMN `interviewToken`,
    DROP COLUMN `messages`;

-- AlterTable
ALTER TABLE `UserChat` DROP COLUMN `messages`;
