-- CreateTable
CREATE TABLE "ImageGeneration" (
    "id" SERIAL NOT NULL,
    "prompt" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "objectUrl" VARCHAR(255) NOT NULL,
    "extra" JSONB,
    "generatedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ImageGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImageGeneration_promptHash_key" ON "ImageGeneration"("promptHash");
