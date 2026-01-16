-- AlterEnum
ALTER TYPE "UserChatKind" ADD VALUE 'universal';

-- CreateTable
CREATE TABLE "AgentSkill" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "objectUrl" VARCHAR(255) NOT NULL,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AgentSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentSkill_userId_name_key" ON "AgentSkill"("userId", "name");

-- AddForeignKey
ALTER TABLE "AgentSkill" ADD CONSTRAINT "AgentSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
