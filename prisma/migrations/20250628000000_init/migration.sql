-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'REGULAR_ADMIN');

-- CreateEnum
CREATE TYPE "UserChatKind" AS ENUM ('scout', 'study', 'interview', 'interviewSession', 'misc');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('system', 'user', 'assistant', 'data');

-- CreateEnum
CREATE TYPE "ChatStatisticsDimension" AS ENUM ('tokens', 'duration', 'steps', 'personas', 'interviews');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'succeeded', 'failed');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('CNY', 'USD');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('pro', 'max');

-- CreateEnum
CREATE TYPE "UserTokensLogVerb" AS ENUM ('recharge', 'consume', 'subscription', 'gift', 'signup');

-- CreateEnum
CREATE TYPE "UserTokensLogResourceType" AS ENUM ('StudyUserChat', 'ScoutUserChat', 'InterviewProject', 'PaymentRecord', 'UserSubscription');

-- CreateEnum
CREATE TYPE "InterviewSessionKind" AS ENUM ('clarify', 'collect');

-- CreateEnum
CREATE TYPE "InterviewSessionStatus" AS ENUM ('pending', 'active', 'completed');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(64) NOT NULL DEFAULT '',
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "emailVerified" TIMESTAMPTZ(6),
    "lastLogin" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'REGULAR_ADMIN',
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "code" VARCHAR(16) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6),

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationCode" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(16) NOT NULL,
    "usedBy" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMPTZ(6),

    CONSTRAINT "InvitationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "source" VARCHAR(255) NOT NULL,
    "tags" JSONB NOT NULL,
    "samples" JSONB NOT NULL,
    "prompt" TEXT NOT NULL,
    "scoutUserChatId" INTEGER,
    "locale" VARCHAR(16),
    "embedding" vector(1024),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analyst" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "brief" TEXT NOT NULL,
    "role" VARCHAR(255) NOT NULL,
    "topic" TEXT NOT NULL,
    "studySummary" TEXT NOT NULL,
    "studyUserChatId" INTEGER,
    "attachments" JSONB,
    "kind" VARCHAR(16),
    "locale" VARCHAR(16),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Analyst_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeaturedStudy" (
    "id" SERIAL NOT NULL,
    "analystId" INTEGER NOT NULL,
    "studyUserChatId" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "category" VARCHAR(64),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "FeaturedStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalystReport" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "analystId" INTEGER NOT NULL,
    "instruction" TEXT NOT NULL,
    "coverSvg" TEXT NOT NULL,
    "onePageHtml" TEXT NOT NULL,
    "generatedAt" TIMESTAMPTZ(6),
    "extra" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AnalystReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalystInterview" (
    "id" SERIAL NOT NULL,
    "analystId" INTEGER NOT NULL,
    "personaId" INTEGER NOT NULL,
    "instruction" TEXT NOT NULL,
    "conclusion" TEXT NOT NULL,
    "interviewUserChatId" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AnalystInterview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserChat" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "kind" "UserChatKind" NOT NULL,
    "backgroundToken" VARCHAR(255),
    "extra" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" SERIAL NOT NULL,
    "messageId" VARCHAR(64) NOT NULL,
    "userChatId" INTEGER NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "parts" JSONB NOT NULL,
    "extra" JSONB,
    "attachments" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatStatistics" (
    "id" SERIAL NOT NULL,
    "userChatId" INTEGER NOT NULL,
    "dimension" "ChatStatisticsDimension" NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "extra" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ChatStatistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "orderNo" VARCHAR(64) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "paymentMethod" VARCHAR(64) NOT NULL,
    "charge" JSONB NOT NULL,
    "chargeId" VARCHAR(255) NOT NULL,
    "credential" JSONB NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "paidAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "currency" "Currency" NOT NULL,
    "extra" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentLine" (
    "id" SERIAL NOT NULL,
    "paymentRecordId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "productName" VARCHAR(64) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'CNY',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PaymentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSubscription" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "startsAt" TIMESTAMPTZ(6) NOT NULL,
    "endsAt" TIMESTAMPTZ(6) NOT NULL,
    "extra" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTokens" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "permanentBalance" INTEGER NOT NULL DEFAULT 0,
    "monthlyBalance" INTEGER NOT NULL DEFAULT 0,
    "monthlyResetAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserTokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTokensLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "verb" "UserTokensLogVerb" NOT NULL,
    "resourceType" "UserTokensLogResourceType",
    "resourceId" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserTokensLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

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
    "collectSystem" TEXT,
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

-- CreateTable
CREATE TABLE "ImageGeneration" (
    "id" SERIAL NOT NULL,
    "prompt" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "objectUrl" VARCHAR(255) NOT NULL,
    "extra" JSONB,
    "generatedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ImageGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_userId_key" ON "AdminUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InvitationCode_code_key" ON "InvitationCode"("code");

-- CreateIndex
-- CREATE INDEX "Persona_embedding_idx" ON "Persona"("embedding");
-- 人工修改索引，Prisma 生成的是上面那样的，不对
CREATE INDEX "Persona_embedding_idx" on "Persona" USING hnsw ("embedding" vector_cosine_ops);

-- CreateIndex
CREATE UNIQUE INDEX "Analyst_studyUserChatId_key" ON "Analyst"("studyUserChatId");

-- CreateIndex
CREATE UNIQUE INDEX "FeaturedStudy_analystId_key" ON "FeaturedStudy"("analystId");

-- CreateIndex
CREATE UNIQUE INDEX "FeaturedStudy_studyUserChatId_key" ON "FeaturedStudy"("studyUserChatId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalystReport_token_key" ON "AnalystReport"("token");

-- CreateIndex
CREATE UNIQUE INDEX "AnalystInterview_interviewUserChatId_key" ON "AnalystInterview"("interviewUserChatId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalystInterview_analystId_personaId_key" ON "AnalystInterview"("analystId", "personaId");

-- CreateIndex
CREATE UNIQUE INDEX "UserChat_token_key" ON "UserChat"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessage_messageId_key" ON "ChatMessage"("messageId");

-- CreateIndex
CREATE INDEX "ChatMessage_userChatId_id_idx" ON "ChatMessage"("userChatId", "id");

-- CreateIndex
CREATE INDEX "ChatStatistics_userChatId_dimension_idx" ON "ChatStatistics"("userChatId", "dimension");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRecord_orderNo_key" ON "PaymentRecord"("orderNo");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRecord_chargeId_key" ON "PaymentRecord"("chargeId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_currency_key" ON "Product"("name", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLine_paymentRecordId_productId_key" ON "PaymentLine"("paymentRecordId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTokens_userId_key" ON "UserTokens"("userId");

-- CreateIndex
CREATE INDEX "UserTokensLog_userId_verb_idx" ON "UserTokensLog"("userId", "verb");

-- CreateIndex
CREATE INDEX "UserTokensLog_userId_verb_resourceType_resourceId_idx" ON "UserTokensLog"("userId", "verb", "resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewProject_token_key" ON "InterviewProject"("token");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewSession_token_key" ON "InterviewSession"("token");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewSession_userChatId_key" ON "InterviewSession"("userChatId");

-- CreateIndex
CREATE UNIQUE INDEX "ImageGeneration_promptHash_key" ON "ImageGeneration"("promptHash");

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_scoutUserChatId_fkey" FOREIGN KEY ("scoutUserChatId") REFERENCES "UserChat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analyst" ADD CONSTRAINT "Analyst_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analyst" ADD CONSTRAINT "Analyst_studyUserChatId_fkey" FOREIGN KEY ("studyUserChatId") REFERENCES "UserChat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedStudy" ADD CONSTRAINT "FeaturedStudy_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES "Analyst"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedStudy" ADD CONSTRAINT "FeaturedStudy_studyUserChatId_fkey" FOREIGN KEY ("studyUserChatId") REFERENCES "UserChat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalystReport" ADD CONSTRAINT "AnalystReport_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES "Analyst"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalystInterview" ADD CONSTRAINT "AnalystInterview_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES "Analyst"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalystInterview" ADD CONSTRAINT "AnalystInterview_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalystInterview" ADD CONSTRAINT "AnalystInterview_interviewUserChatId_fkey" FOREIGN KEY ("interviewUserChatId") REFERENCES "UserChat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChat" ADD CONSTRAINT "UserChat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userChatId_fkey" FOREIGN KEY ("userChatId") REFERENCES "UserChat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatStatistics" ADD CONSTRAINT "ChatStatistics_userChatId_fkey" FOREIGN KEY ("userChatId") REFERENCES "UserChat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLine" ADD CONSTRAINT "PaymentLine_paymentRecordId_fkey" FOREIGN KEY ("paymentRecordId") REFERENCES "PaymentRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLine" ADD CONSTRAINT "PaymentLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTokens" ADD CONSTRAINT "UserTokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTokensLog" ADD CONSTRAINT "UserTokensLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewProject" ADD CONSTRAINT "InterviewProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "InterviewProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_userChatId_fkey" FOREIGN KEY ("userChatId") REFERENCES "UserChat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
