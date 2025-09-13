/*
  Warnings:

  - You are about to drop the `TeamTokens` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[activeUserSubscriptionId]` on the table `TokensAccount` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "TeamTokens" DROP CONSTRAINT "TeamTokens_teamId_fkey";

-- AlterTable
ALTER TABLE "TokensAccount" ADD COLUMN     "activeUserSubscriptionId" INTEGER;

-- DropTable
DROP TABLE "TeamTokens";

-- CreateIndex
CREATE UNIQUE INDEX "TokensAccount_activeUserSubscriptionId_key" ON "TokensAccount"("activeUserSubscriptionId");

-- AddForeignKey
ALTER TABLE "TokensAccount" ADD CONSTRAINT "TokensAccount_activeUserSubscriptionId_fkey" FOREIGN KEY ("activeUserSubscriptionId") REFERENCES "UserSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
