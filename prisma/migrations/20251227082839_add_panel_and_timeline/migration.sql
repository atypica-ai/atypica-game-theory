-- CreateTable
CREATE TABLE "PersonaPanel" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "personaIds" JSONB NOT NULL DEFAULT '[]',
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PersonaPanel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionTimeline" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "personaPanelId" INTEGER,
    "instruction" TEXT NOT NULL,
    "events" JSONB NOT NULL DEFAULT '[]',
    "summary" TEXT NOT NULL,
    "minutes" TEXT NOT NULL,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DiscussionTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonaPanel_userId_idx" ON "PersonaPanel"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscussionTimeline_token_key" ON "DiscussionTimeline"("token");

-- CreateIndex
CREATE INDEX "DiscussionTimeline_personaPanelId_idx" ON "DiscussionTimeline"("personaPanelId");

-- AddForeignKey
ALTER TABLE "DiscussionTimeline" ADD CONSTRAINT "DiscussionTimeline_personaPanelId_fkey" FOREIGN KEY ("personaPanelId") REFERENCES "PersonaPanel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
