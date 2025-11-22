-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'REGULAR_ADMIN');

-- CreateEnum
CREATE TYPE "UserChatKind" AS ENUM ('scout', 'study', 'interview', 'interviewSession', 'sageSession', 'misc');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('system', 'user', 'assistant', 'data');

-- CreateEnum
CREATE TYPE "ChatStatisticsDimension" AS ENUM ('tokens', 'duration', 'steps', 'personas', 'interviews');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'succeeded', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('CNY', 'USD');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('pro', 'max', 'super', 'team', 'superteam');

-- CreateEnum
CREATE TYPE "TokensLogVerb" AS ENUM ('recharge', 'consume', 'subscription', 'subscriptionReset', 'gift', 'signup');

-- CreateTable
CREATE TABLE "TeamConfig" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "value" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TeamConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "seats" INTEGER NOT NULL,
    "ownerUserId" INTEGER NOT NULL,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(64) NOT NULL DEFAULT '',
    "email" TEXT,
    "password" TEXT NOT NULL,
    "emailVerified" TIMESTAMPTZ(6),
    "teamIdAsMember" INTEGER,
    "personalUserId" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "lastLogin" JSONB NOT NULL DEFAULT '{}',
    "onboarding" JSONB NOT NULL DEFAULT '{}',
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'REGULAR_ADMIN',
    "permissions" JSONB NOT NULL DEFAULT '[]',
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
CREATE TABLE "Persona" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "source" VARCHAR(255) NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "samples" JSONB NOT NULL DEFAULT '[]',
    "prompt" TEXT NOT NULL,
    "locale" VARCHAR(16),
    "tier" INTEGER NOT NULL DEFAULT 0,
    "scoutUserChatId" INTEGER,
    "personaImportId" INTEGER,
    "embedding" halfvec(1024),
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
    "studyLog" TEXT NOT NULL DEFAULT '',
    "studyUserChatId" INTEGER,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "kind" VARCHAR(16),
    "locale" VARCHAR(16),
    "extra" JSONB NOT NULL DEFAULT '{}',
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
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AnalystReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalystPodcast" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "analystId" INTEGER NOT NULL,
    "instruction" TEXT NOT NULL,
    "script" TEXT NOT NULL,
    "objectUrl" VARCHAR(255),
    "generatedAt" TIMESTAMPTZ(6),
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AnalystPodcast_pkey" PRIMARY KEY ("id")
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
    "extra" JSONB NOT NULL DEFAULT '{}',
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
    "parts" JSONB NOT NULL DEFAULT '[]',
    "extra" JSONB NOT NULL DEFAULT '{}',
    "attachments" JSONB NOT NULL DEFAULT '[]',
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
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ChatStatistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "currency" "Currency" NOT NULL,
    "stripePriceId" VARCHAR(50),
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
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
    "description" VARCHAR(255) NOT NULL,
    "paidAt" TIMESTAMPTZ(6),
    "pingxxCharge" JSONB NOT NULL DEFAULT '{}',
    "pingxxChargeId" VARCHAR(255),
    "pingxxCredential" JSONB NOT NULL DEFAULT '{}',
    "stripeInvoice" JSONB NOT NULL DEFAULT '{}',
    "stripeInvoiceId" VARCHAR(50),
    "stripeSession" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "Subscription" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "teamId" INTEGER,
    "plan" "SubscriptionPlan" NOT NULL,
    "startsAt" TIMESTAMPTZ(6) NOT NULL,
    "endsAt" TIMESTAMPTZ(6) NOT NULL,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "paymentRecordId" INTEGER,
    "stripeSubscriptionId" VARCHAR(50),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokensAccount" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "teamId" INTEGER,
    "permanentBalance" INTEGER NOT NULL DEFAULT 0,
    "monthlyBalance" INTEGER NOT NULL DEFAULT 0,
    "monthlyResetAt" TIMESTAMPTZ(6),
    "extra" JSONB NOT NULL DEFAULT '{}',
    "activeSubscriptionId" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TokensAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokensLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "teamId" INTEGER,
    "value" INTEGER NOT NULL,
    "verb" "TokensLogVerb" NOT NULL,
    "resourceType" VARCHAR(50),
    "resourceId" INTEGER,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TokensLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "value" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageGeneration" (
    "id" SERIAL NOT NULL,
    "prompt" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "objectUrl" VARCHAR(255) NOT NULL,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "generatedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ImageGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttachmentFile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(255) NOT NULL,
    "size" INTEGER NOT NULL,
    "objectUrl" VARCHAR(255) NOT NULL,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AttachmentFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaImport" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "context" TEXT NOT NULL DEFAULT '',
    "analysis" JSONB NOT NULL DEFAULT '{}',
    "extra" JSONB NOT NULL DEFAULT '{}',
    "extraUserChatId" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PersonaImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPersonaChatRelation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "personaId" INTEGER NOT NULL,
    "userChatId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "UserPersonaChatRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewProject" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "brief" TEXT NOT NULL,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InterviewProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewSession" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "projectId" INTEGER NOT NULL,
    "userChatId" INTEGER,
    "intervieweeUserId" INTEGER,
    "intervieweePersonaId" INTEGER,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InterviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewReport" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(64) NOT NULL,
    "projectId" INTEGER NOT NULL,
    "onePageHtml" TEXT NOT NULL,
    "generatedAt" TIMESTAMPTZ(6),
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InterviewReport_pkey" PRIMARY KEY ("id")
);

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
CREATE UNIQUE INDEX "TeamConfig_teamId_key_key" ON "TeamConfig"("teamId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_teamIdAsMember_personalUserId_key" ON "User"("teamIdAsMember", "personalUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_userId_key" ON "AdminUser"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Persona_token_key" ON "Persona"("token");

-- CreateIndex
-- CREATE INDEX "Persona_embedding_idx" ON "Persona"("embedding");
CREATE INDEX "Persona_embedding_idx" ON "Persona" USING hnsw ("embedding" halfvec_cosine_ops) WITH (m = 16, ef_construction = 64);

-- CreateIndex
CREATE INDEX "Persona_tier_locale_idx" ON "Persona"("tier", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Analyst_studyUserChatId_key" ON "Analyst"("studyUserChatId");

-- CreateIndex
CREATE UNIQUE INDEX "FeaturedStudy_analystId_key" ON "FeaturedStudy"("analystId");

-- CreateIndex
CREATE UNIQUE INDEX "FeaturedStudy_studyUserChatId_key" ON "FeaturedStudy"("studyUserChatId");

-- CreateIndex
CREATE UNIQUE INDEX "AnalystReport_token_key" ON "AnalystReport"("token");

-- CreateIndex
CREATE UNIQUE INDEX "AnalystPodcast_token_key" ON "AnalystPodcast"("token");

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
CREATE UNIQUE INDEX "Product_name_currency_key" ON "Product"("name", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRecord_orderNo_key" ON "PaymentRecord"("orderNo");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRecord_pingxxChargeId_key" ON "PaymentRecord"("pingxxChargeId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRecord_stripeInvoiceId_key" ON "PaymentRecord"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLine_paymentRecordId_productId_key" ON "PaymentLine"("paymentRecordId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentLine_paymentRecordId_productName_key" ON "PaymentLine"("paymentRecordId", "productName");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_paymentRecordId_key" ON "Subscription"("paymentRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "TokensAccount_userId_key" ON "TokensAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TokensAccount_teamId_key" ON "TokensAccount"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TokensAccount_activeSubscriptionId_key" ON "TokensAccount"("activeSubscriptionId");

-- CreateIndex
CREATE INDEX "TokensLog_userId_verb_resourceType_resourceId_idx" ON "TokensLog"("userId", "verb", "resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "TokensLog_teamId_verb_resourceType_resourceId_idx" ON "TokensLog"("teamId", "verb", "resourceType", "resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ImageGeneration_promptHash_key" ON "ImageGeneration"("promptHash");

-- CreateIndex
CREATE UNIQUE INDEX "AttachmentFile_objectUrl_key" ON "AttachmentFile"("objectUrl");

-- CreateIndex
CREATE UNIQUE INDEX "PersonaImport_extraUserChatId_key" ON "PersonaImport"("extraUserChatId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPersonaChatRelation_userChatId_key" ON "UserPersonaChatRelation"("userChatId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPersonaChatRelation_userId_personaId_key" ON "UserPersonaChatRelation"("userId", "personaId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewProject_token_key" ON "InterviewProject"("token");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewSession_userChatId_key" ON "InterviewSession"("userChatId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewReport_token_key" ON "InterviewReport"("token");

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
ALTER TABLE "TeamConfig" ADD CONSTRAINT "TeamConfig_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamIdAsMember_fkey" FOREIGN KEY ("teamIdAsMember") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_personalUserId_fkey" FOREIGN KEY ("personalUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminUser" ADD CONSTRAINT "AdminUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_scoutUserChatId_fkey" FOREIGN KEY ("scoutUserChatId") REFERENCES "UserChat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_personaImportId_fkey" FOREIGN KEY ("personaImportId") REFERENCES "PersonaImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "AnalystPodcast" ADD CONSTRAINT "AnalystPodcast_analystId_fkey" FOREIGN KEY ("analystId") REFERENCES "Analyst"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_paymentRecordId_fkey" FOREIGN KEY ("paymentRecordId") REFERENCES "PaymentRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokensAccount" ADD CONSTRAINT "TokensAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokensAccount" ADD CONSTRAINT "TokensAccount_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokensAccount" ADD CONSTRAINT "TokensAccount_activeSubscriptionId_fkey" FOREIGN KEY ("activeSubscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokensLog" ADD CONSTRAINT "TokensLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokensLog" ADD CONSTRAINT "TokensLog_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttachmentFile" ADD CONSTRAINT "AttachmentFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaImport" ADD CONSTRAINT "PersonaImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonaImport" ADD CONSTRAINT "PersonaImport_extraUserChatId_fkey" FOREIGN KEY ("extraUserChatId") REFERENCES "UserChat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPersonaChatRelation" ADD CONSTRAINT "UserPersonaChatRelation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPersonaChatRelation" ADD CONSTRAINT "UserPersonaChatRelation_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPersonaChatRelation" ADD CONSTRAINT "UserPersonaChatRelation_userChatId_fkey" FOREIGN KEY ("userChatId") REFERENCES "UserChat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewProject" ADD CONSTRAINT "InterviewProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "InterviewProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_userChatId_fkey" FOREIGN KEY ("userChatId") REFERENCES "UserChat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_intervieweeUserId_fkey" FOREIGN KEY ("intervieweeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewSession" ADD CONSTRAINT "InterviewSession_intervieweePersonaId_fkey" FOREIGN KEY ("intervieweePersonaId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewReport" ADD CONSTRAINT "InterviewReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "InterviewProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
