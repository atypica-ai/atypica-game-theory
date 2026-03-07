-- CreateTable
CREATE TABLE "Pulse" (
    "id" SERIAL NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "dataSource" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "locale" VARCHAR(16) NOT NULL DEFAULT 'en-US',
    "expireAt" TIMESTAMPTZ(6) NOT NULL,
    "heatScore" DOUBLE PRECISION,
    "heatDelta" DOUBLE PRECISION,
    "expired" BOOLEAN NOT NULL DEFAULT false,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Pulse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPulseRecommendation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "pulseIds" JSONB NOT NULL DEFAULT '[]',
    "recommendation" JSONB NOT NULL DEFAULT '[]',
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserPulseRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pulse_dataSource_idx" ON "Pulse"("dataSource");

-- CreateIndex
CREATE INDEX "Pulse_expireAt_idx" ON "Pulse"("expireAt");

-- CreateIndex
CREATE INDEX "Pulse_expired_expireAt_idx" ON "Pulse"("expired", "expireAt");

-- CreateIndex
CREATE INDEX "Pulse_category_expired_idx" ON "Pulse"("category", "expired");

-- CreateIndex
CREATE INDEX "Pulse_category_createdAt_idx" ON "Pulse"("category", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Pulse_category_expired_heatDelta_idx" ON "Pulse"("category", "expired", "heatDelta" DESC);

-- CreateIndex
CREATE INDEX "Pulse_createdAt_heatScore_idx" ON "Pulse"("createdAt" DESC, "heatScore");

-- CreateIndex
CREATE INDEX "Pulse_title_category_idx" ON "Pulse"("title", "category");

-- CreateIndex
CREATE INDEX "UserPulseRecommendation_userId_idx" ON "UserPulseRecommendation"("userId");

-- CreateIndex
CREATE INDEX "UserPulseRecommendation_userId_createdAt_idx" ON "UserPulseRecommendation"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "UserPulseRecommendation" ADD CONSTRAINT "UserPulseRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
