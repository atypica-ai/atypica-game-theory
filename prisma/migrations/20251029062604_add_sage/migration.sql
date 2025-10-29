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
    "locale" VARCHAR(16) NOT NULL,
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
CREATE TABLE "SageSource" (
    "id" SERIAL NOT NULL,
    "sageId" INTEGER NOT NULL,
    "type" VARCHAR(32) NOT NULL,
    "content" JSONB NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "title" VARCHAR(255),
    "extractedText" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SageSource_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "SageKnowledgeGap" (
    "id" SERIAL NOT NULL,
    "sageId" INTEGER NOT NULL,
    "area" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "severity" VARCHAR(32) NOT NULL,
    "impact" TEXT NOT NULL,
    "sourceType" VARCHAR(64) NOT NULL,
    "sourceDescription" TEXT NOT NULL,
    "sourceReference" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "resolvedAt" TIMESTAMPTZ(6),
    "resolvedBy" VARCHAR(64),
    "resolvedByInterviewId" INTEGER,
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
    "source" VARCHAR(64) NOT NULL,
    "sourceReference" TEXT,
    "changeNotes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SageMemoryDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sage_token_key" ON "Sage"("token");

-- CreateIndex
CREATE INDEX "Sage_userId_domain_idx" ON "Sage"("userId", "domain");

-- CreateIndex
CREATE INDEX "Sage_isPublic_domain_locale_idx" ON "Sage"("isPublic", "domain", "locale");

-- CreateIndex
CREATE INDEX "SageSource_sageId_status_idx" ON "SageSource"("sageId", "status");

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

-- CreateIndex
CREATE INDEX "SageKnowledgeGap_sageId_status_idx" ON "SageKnowledgeGap"("sageId", "status");

-- CreateIndex
CREATE INDEX "SageKnowledgeGap_sageId_createdAt_idx" ON "SageKnowledgeGap"("sageId", "createdAt");

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
ALTER TABLE "SageChat" ADD CONSTRAINT "SageChat_userChatId_fkey" FOREIGN KEY ("userChatId") REFERENCES "UserChat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageChat" ADD CONSTRAINT "SageChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageInterview" ADD CONSTRAINT "SageInterview_sageId_fkey" FOREIGN KEY ("sageId") REFERENCES "Sage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageInterview" ADD CONSTRAINT "SageInterview_userChatId_fkey" FOREIGN KEY ("userChatId") REFERENCES "UserChat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageKnowledgeGap" ADD CONSTRAINT "SageKnowledgeGap_sageId_fkey" FOREIGN KEY ("sageId") REFERENCES "Sage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageKnowledgeGap" ADD CONSTRAINT "SageKnowledgeGap_resolvedByInterviewId_fkey" FOREIGN KEY ("resolvedByInterviewId") REFERENCES "SageInterview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SageMemoryDocument" ADD CONSTRAINT "SageMemoryDocument_sageId_fkey" FOREIGN KEY ("sageId") REFERENCES "Sage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
