/*
  Warnings:

  - You are about to drop the column `resolvedBy` on the `SageKnowledgeGap` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `SageKnowledgeGap` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SageKnowledgeGap" DROP COLUMN "resolvedBy",
DROP COLUMN "source";

-- AlterTable
ALTER TABLE "SageMemoryDocument" ADD COLUMN     "core" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "working" JSONB NOT NULL DEFAULT '[]';
