-- Rename enum
ALTER TYPE "UserTokensLogVerb" RENAME TO "TokensLogVerb";

-- Drop existing foreign key constraints
ALTER TABLE "UserTokensLog" DROP CONSTRAINT "UserTokensLog_userId_fkey";
ALTER TABLE "TokensAccount" DROP CONSTRAINT "TokensAccount_activeUserSubscriptionId_fkey";
ALTER TABLE "UserSubscription" DROP CONSTRAINT "UserSubscription_userId_fkey";
ALTER TABLE "UserSubscription" DROP CONSTRAINT "UserSubscription_paymentRecordId_fkey";

-- Rename table UserTokensLog to TokensLog
ALTER TABLE "UserTokensLog" RENAME TO "TokensLog";

-- Rename primary key constraint
ALTER TABLE "TokensLog" RENAME CONSTRAINT "UserTokensLog_pkey" TO "TokensLog_pkey";

-- Add teamId column to TokensLog
ALTER TABLE "TokensLog" ADD COLUMN "teamId" INTEGER;

-- Make userId nullable in TokensLog
ALTER TABLE "TokensLog" ALTER COLUMN "userId" DROP NOT NULL;

-- Change resourceType from enum to varchar
ALTER TABLE "TokensLog" ALTER COLUMN "resourceType" TYPE VARCHAR(50) USING "resourceType"::text;

-- Drop old indexes for TokensLog
DROP INDEX "UserTokensLog_userId_verb_idx";
DROP INDEX "UserTokensLog_userId_verb_resourceType_resourceId_idx";

-- Create new indexes for TokensLog
CREATE INDEX "TokensLog_userId_verb_resourceType_resourceId_idx" ON "TokensLog"("userId", "verb", "resourceType", "resourceId");
CREATE INDEX "TokensLog_teamId_verb_resourceType_resourceId_idx" ON "TokensLog"("teamId", "verb", "resourceType", "resourceId");

-- Add foreign key constraints for TokensLog
ALTER TABLE "TokensLog" ADD CONSTRAINT "TokensLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TokensLog" ADD CONSTRAINT "TokensLog_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rename table UserSubscription to Subscription
ALTER TABLE "UserSubscription" RENAME TO "Subscription";

-- Rename primary key constraint
ALTER TABLE "Subscription" RENAME CONSTRAINT "UserSubscription_pkey" TO "Subscription_pkey";

-- Add teamId column to Subscription
ALTER TABLE "Subscription" ADD COLUMN "teamId" INTEGER;

-- Make userId nullable in Subscription
ALTER TABLE "Subscription" ALTER COLUMN "userId" DROP NOT NULL;

-- Rename unique index
ALTER INDEX "UserSubscription_paymentRecordId_key" RENAME TO "Subscription_paymentRecordId_key";

-- Add foreign key constraints for Subscription
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_paymentRecordId_fkey" FOREIGN KEY ("paymentRecordId") REFERENCES "PaymentRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update TokensAccount: rename activeUserSubscriptionId to activeSubscriptionId
DROP INDEX "TokensAccount_activeUserSubscriptionId_key";
ALTER TABLE "TokensAccount" RENAME COLUMN "activeUserSubscriptionId" TO "activeSubscriptionId";
CREATE UNIQUE INDEX "TokensAccount_activeSubscriptionId_key" ON "TokensAccount"("activeSubscriptionId");
ALTER TABLE "TokensAccount" ADD CONSTRAINT "TokensAccount_activeSubscriptionId_fkey" FOREIGN KEY ("activeSubscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop unused enum
DROP TYPE "UserTokensLogResourceType";
