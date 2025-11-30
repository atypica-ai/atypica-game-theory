-- AlterTable
ALTER TABLE "SageMemoryDocument" ADD COLUMN     "core" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "episodic" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "working" JSONB NOT NULL DEFAULT '[]';
