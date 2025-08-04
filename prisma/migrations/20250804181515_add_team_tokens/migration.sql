-- CreateTable
CREATE TABLE "TeamTokens" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "permanentBalance" INTEGER NOT NULL DEFAULT 0,
    "monthlyBalance" INTEGER NOT NULL DEFAULT 0,
    "monthlyResetAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TeamTokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamTokens_teamId_key" ON "TeamTokens"("teamId");

-- AddForeignKey
ALTER TABLE "TeamTokens" ADD CONSTRAINT "TeamTokens_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
