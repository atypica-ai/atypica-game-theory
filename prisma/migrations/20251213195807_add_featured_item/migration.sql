-- CreateTable
CREATE TABLE "FeaturedItem" (
    "id" SERIAL NOT NULL,
    "resourceType" VARCHAR(50) NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "locale" VARCHAR(16) NOT NULL,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "FeaturedItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeaturedItem_resourceType_resourceId_idx" ON "FeaturedItem"("resourceType", "resourceId");
