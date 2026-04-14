-- CreateTable
CREATE TABLE "GameStats" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "sessionCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "GameStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameStats_key_key" ON "GameStats"("key");
