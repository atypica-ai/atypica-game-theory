-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserChatKind" ADD VALUE 'sageChat';
ALTER TYPE "UserChatKind" ADD VALUE 'sageInterview';

-- CreateTable
CREATE TABLE "Sage" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "expertise" JSONB NOT NULL DEFAULT '[]',
    "locale" VARCHAR(16) NOT NULL,
    "memoryDocument" TEXT NOT NULL,
    "embedding" halfvec(1024),
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "allowTools" BOOLEAN NOT NULL DEFAULT true,
    "chatCount" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMPTZ(6),
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Sage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SageChat" (
    "id" SERIAL NOT NULL,
    "sageId" INTEGER NOT NULL,
    "userChatId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "chatType" VARCHAR(32) NOT NULL DEFAULT 'consultation',
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SageChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SageInterview" (
    "id" SERIAL NOT NULL,
    "sageId" INTEGER NOT NULL,
    "userChatId" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "focusAreas" JSONB NOT NULL DEFAULT '[]',
    "status" VARCHAR(32) NOT NULL DEFAULT 'ongoing',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "summary" TEXT,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SageInterview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sage_token_key" ON "Sage"("token");

-- CreateIndex
CREATE INDEX "Sage_embedding_idx" ON "Sage"("embedding");

-- CreateIndex
CREATE INDEX "Sage_userId_domain_idx" ON "Sage"("userId", "domain");

-- CreateIndex
CREATE INDEX "Sage_isPublic_domain_locale_idx" ON "Sage"("isPublic", "domain", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "SageChat_userChatId_key" ON "SageChat"("userChatId");

-- CreateIndex
CREATE INDEX "SageChat_sageId_idx" ON "SageChat"("sageId");

-- CreateIndex
CREATE INDEX "SageChat_userId_idx" ON "SageChat"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SageInterview_userChatId_key" ON "SageInterview"("userChatId");

-- CreateIndex
CREATE INDEX "SageInterview_sageId_status_idx" ON "SageInterview"("sageId", "status");

-- AddForeignKey
ALTER TABLE "Sage" ADD CONSTRAINT "Sage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageChat" ADD CONSTRAINT "SageChat_sageId_fkey" FOREIGN KEY ("sageId") REFERENCES "Sage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageChat" ADD CONSTRAINT "SageChat_userChatId_fkey" FOREIGN KEY ("userChatId") REFERENCES "UserChat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageChat" ADD CONSTRAINT "SageChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageInterview" ADD CONSTRAINT "SageInterview_sageId_fkey" FOREIGN KEY ("sageId") REFERENCES "Sage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageInterview" ADD CONSTRAINT "SageInterview_userChatId_fkey" FOREIGN KEY ("userChatId") REFERENCES "UserChat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
