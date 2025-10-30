-- AlterEnum
ALTER TYPE "UserChatKind" ADD VALUE 'sageSession';

-- CreateTable
CREATE TABLE "Sage" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "expertise" JSONB NOT NULL DEFAULT '[]',
    "avatar" JSONB NOT NULL DEFAULT '{}',
    "bio" TEXT NOT NULL,
    "locale" VARCHAR(16) NOT NULL,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Sage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SageSource" (
    "id" SERIAL NOT NULL,
    "sageId" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "extractedText" TEXT NOT NULL,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SageSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SageChat" (
    "id" SERIAL NOT NULL,
    "sageId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "userChatId" INTEGER NOT NULL,
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
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SageInterview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SageKnowledgeGap" (
    "id" SERIAL NOT NULL,
    "sageId" INTEGER NOT NULL,
    "area" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "severity" VARCHAR(32) NOT NULL,
    "impact" TEXT NOT NULL,
    "source" JSONB NOT NULL DEFAULT '{}',
    "resolvedBy" JSONB NOT NULL DEFAULT '{}',
    "resolvedAt" TIMESTAMPTZ(6),
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SageKnowledgeGap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SageMemoryDocument" (
    "id" SERIAL NOT NULL,
    "sageId" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "changeNotes" TEXT NOT NULL,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SageMemoryDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sage_token_key" ON "Sage"("token");

-- CreateIndex
CREATE UNIQUE INDEX "SageChat_userChatId_key" ON "SageChat"("userChatId");

-- CreateIndex
CREATE UNIQUE INDEX "SageInterview_userChatId_key" ON "SageInterview"("userChatId");

-- CreateIndex
CREATE INDEX "SageMemoryDocument_sageId_version_idx" ON "SageMemoryDocument"("sageId", "version" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SageMemoryDocument_sageId_version_key" ON "SageMemoryDocument"("sageId", "version");

-- AddForeignKey
ALTER TABLE "Sage" ADD CONSTRAINT "Sage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageSource" ADD CONSTRAINT "SageSource_sageId_fkey" FOREIGN KEY ("sageId") REFERENCES "Sage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageChat" ADD CONSTRAINT "SageChat_sageId_fkey" FOREIGN KEY ("sageId") REFERENCES "Sage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageChat" ADD CONSTRAINT "SageChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageChat" ADD CONSTRAINT "SageChat_userChatId_fkey" FOREIGN KEY ("userChatId") REFERENCES "UserChat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageInterview" ADD CONSTRAINT "SageInterview_sageId_fkey" FOREIGN KEY ("sageId") REFERENCES "Sage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageInterview" ADD CONSTRAINT "SageInterview_userChatId_fkey" FOREIGN KEY ("userChatId") REFERENCES "UserChat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageKnowledgeGap" ADD CONSTRAINT "SageKnowledgeGap_sageId_fkey" FOREIGN KEY ("sageId") REFERENCES "Sage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageMemoryDocument" ADD CONSTRAINT "SageMemoryDocument_sageId_fkey" FOREIGN KEY ("sageId") REFERENCES "Sage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
