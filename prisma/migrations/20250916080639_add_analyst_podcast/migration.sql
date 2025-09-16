-- CreateTable
CREATE TABLE "AnalystPodcast" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "analystId" INTEGER NOT NULL,
    "instruction" TEXT NOT NULL,
    "script" TEXT NOT NULL,
    "podcastUrl" VARCHAR(500),
    "generatedAt" TIMESTAMPTZ(6),
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AnalystPodcast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalystPodcast_token_key" ON "AnalystPodcast"("token");

-- AddForeignKey
ALTER TABLE "AnalystPodcast" ADD CONSTRAINT "AnalystPodcast_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES "Analyst"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
