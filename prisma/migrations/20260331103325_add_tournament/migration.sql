-- CreateTable
CREATE TABLE "Tournament" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "personaIds" JSONB NOT NULL DEFAULT '[]',
    "state" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_token_key" ON "Tournament"("token");
