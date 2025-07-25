-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "title" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "InterviewReport" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "projectId" INTEGER NOT NULL,
    "onePageHtml" TEXT NOT NULL,
    "generatedAt" TIMESTAMPTZ(6),
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InterviewReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewReport_token_key" ON "InterviewReport"("token");

-- AddForeignKey
ALTER TABLE "InterviewReport" ADD CONSTRAINT "InterviewReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "InterviewProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
