/*
  Warnings:

  - A unique constraint covering the columns `[paymentRecordId]` on the table `UserSubscription` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "UserSubscription" ADD COLUMN     "paymentRecordId" INTEGER,
ADD COLUMN     "stripeSubscriptionId" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "UserSubscription_paymentRecordId_key" ON "UserSubscription"("paymentRecordId");

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_paymentRecordId_fkey" FOREIGN KEY ("paymentRecordId") REFERENCES "PaymentRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
