-- CreateTable
CREATE TABLE "GameSession" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "gameType" VARCHAR(64) NOT NULL,
    "personaIds" JSONB NOT NULL DEFAULT '[]',
    "timeline" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameSession_token_key" ON "GameSession"("token");
