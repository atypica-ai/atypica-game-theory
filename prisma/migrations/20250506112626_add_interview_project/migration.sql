-- CreateEnum
CREATE TYPE "InterviewSessionKind" AS ENUM ('clarify', 'collect');

-- CreateEnum
CREATE TYPE "InterviewSessionStatus" AS ENUM ('pending', 'active', 'completed');

-- CreateTable
CREATE TABLE "InterviewProject" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "brief" TEXT,
    "objectives" TEXT[],
    "digest" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InterviewProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewSession" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "userChatId" INTEGER,
    "title" VARCHAR(255) NOT NULL,
    "notes" VARCHAR(255),
    "kind" "InterviewSessionKind" NOT NULL,
    "status" "InterviewSessionStatus" NOT NULL,
    "summary" TEXT,
    "keyInsights" TEXT[],
    "analysis" TEXT,
    "expiresAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InterviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterviewProject_token_key" ON "InterviewProject"("token");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewSession_token_key" ON "InterviewSession"("token");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewSession_userChatId_key" ON "InterviewSession"("userChatId");

-- AddForeignKey
ALTER TABLE "InterviewProject" ADD CONSTRAINT "InterviewProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "InterviewProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_userChatId_fkey" FOREIGN KEY ("userChatId") REFERENCES "UserChat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
