-- CreateTable
CREATE TABLE "KnowledgeGap" (
    "id" SERIAL NOT NULL,
    "sageId" INTEGER NOT NULL,
    "area" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "severity" VARCHAR(32) NOT NULL,
    "impact" TEXT NOT NULL,
    "sourceType" VARCHAR(64) NOT NULL,
    "sourceDescription" TEXT NOT NULL,
    "sourceReference" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "resolvedAt" TIMESTAMPTZ(6),
    "resolvedBy" VARCHAR(64),
    "resolvedByInterviewId" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "KnowledgeGap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryDocumentVersion" (
    "id" SERIAL NOT NULL,
    "sageId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "source" VARCHAR(64) NOT NULL,
    "sourceReference" TEXT,
    "changeNotes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeGap_sageId_status_idx" ON "KnowledgeGap"("sageId", "status");

-- CreateIndex
CREATE INDEX "KnowledgeGap_sageId_createdAt_idx" ON "KnowledgeGap"("sageId", "createdAt");

-- CreateIndex
CREATE INDEX "MemoryDocumentVersion_sageId_version_idx" ON "MemoryDocumentVersion"("sageId", "version" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "MemoryDocumentVersion_sageId_version_key" ON "MemoryDocumentVersion"("sageId", "version");

-- AddForeignKey
ALTER TABLE "KnowledgeGap" ADD CONSTRAINT "KnowledgeGap_sageId_fkey" FOREIGN KEY ("sageId") REFERENCES "Sage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeGap" ADD CONSTRAINT "KnowledgeGap_resolvedByInterviewId_fkey" FOREIGN KEY ("resolvedByInterviewId") REFERENCES "SageInterview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemoryDocumentVersion" ADD CONSTRAINT "MemoryDocumentVersion_sageId_fkey" FOREIGN KEY ("sageId") REFERENCES "Sage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
