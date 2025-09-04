-- AlterTable
ALTER TABLE "InterviewProject" ADD COLUMN     "extra" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "extra" JSONB NOT NULL DEFAULT '{}';
