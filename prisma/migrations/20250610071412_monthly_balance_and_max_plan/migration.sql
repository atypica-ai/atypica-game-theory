/*
  Warnings:

  - You are about to drop the column `balance` on the `UserTokens` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "SubscriptionPlan" ADD VALUE 'max';
ALTER TYPE "UserTokensLogResourceType" ADD VALUE 'UserSubscription';

-- AlterTable
ALTER TABLE "UserTokens" RENAME COLUMN "balance" TO "permanentBalance";
ALTER TABLE "UserTokens" ADD COLUMN "monthlyBalance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserTokens" ADD COLUMN "monthlyResetAt" TIMESTAMPTZ(6);
