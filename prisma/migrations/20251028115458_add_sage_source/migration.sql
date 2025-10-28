-- CreateTable
CREATE TABLE "SageSource" (
    "id" SERIAL NOT NULL,
    "sageId" INTEGER NOT NULL,
    "type" VARCHAR(32) NOT NULL,
    "content" JSONB NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "title" VARCHAR(255),
    "extractedText" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SageSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SageSource_sageId_status_idx" ON "SageSource"("sageId", "status");

-- AddForeignKey
ALTER TABLE "SageSource" ADD CONSTRAINT "SageSource_sageId_fkey" FOREIGN KEY ("sageId") REFERENCES "Sage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
