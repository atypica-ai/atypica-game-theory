/*
  Deprecate Analyst model - rename to LegacyAnalyst

  This migration:
  1. Drops foreign key constraints (decouples from User and UserChat)
  2. Renames table to LegacyAnalyst (preserves all 27958 rows of data)
  3. Keeps all existing indexes
*/

-- DropForeignKey
ALTER TABLE "Analyst" DROP CONSTRAINT "Analyst_studyUserChatId_fkey";

-- DropForeignKey
ALTER TABLE "Analyst" DROP CONSTRAINT "Analyst_userId_fkey";

-- RenameTable (preserves all data)
ALTER TABLE "Analyst" RENAME TO "LegacyAnalyst";

-- Rename constraints and indexes
ALTER INDEX "Analyst_pkey" RENAME TO "LegacyAnalyst_pkey";
ALTER INDEX "Analyst_studyUserChatId_key" RENAME TO "LegacyAnalyst_studyUserChatId_key";
ALTER INDEX "Analyst_userId_idx" RENAME TO "LegacyAnalyst_userId_idx";
