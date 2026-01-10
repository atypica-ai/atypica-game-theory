-- CreateTable
CREATE TABLE "ResearchTemplate" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "locale" VARCHAR(16) NOT NULL,
    "userId" INTEGER,
    "teamId" INTEGER,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ResearchTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResearchTemplate_locale_userId_idx" ON "ResearchTemplate"("locale", "userId");

-- CreateIndex
CREATE INDEX "ResearchTemplate_locale_teamId_idx" ON "ResearchTemplate"("locale", "teamId");

-- AddForeignKey
ALTER TABLE "ResearchTemplate" ADD CONSTRAINT "ResearchTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchTemplate" ADD CONSTRAINT "ResearchTemplate_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
