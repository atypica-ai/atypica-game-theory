-- CreateTable
CREATE TABLE "Memory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "teamId" INTEGER,
    "version" INTEGER NOT NULL,
    "core" TEXT NOT NULL DEFAULT '',
    "working" JSONB NOT NULL DEFAULT '[]',
    "changeNotes" TEXT NOT NULL,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Memory_userId_version_idx" ON "Memory"("userId", "version" DESC);

-- CreateIndex
CREATE INDEX "Memory_teamId_version_idx" ON "Memory"("teamId", "version" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Memory_userId_version_key" ON "Memory"("userId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Memory_teamId_version_key" ON "Memory"("teamId", "version");

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
