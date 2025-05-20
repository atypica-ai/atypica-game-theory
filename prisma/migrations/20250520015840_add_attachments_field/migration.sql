-- AlterTable
ALTER TABLE "Analyst" ADD COLUMN     "attachments" JSONB;

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "attachments" JSONB;
