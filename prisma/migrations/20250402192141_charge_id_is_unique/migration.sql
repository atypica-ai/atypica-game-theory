/*
  Warnings:

  - A unique constraint covering the columns `[chargeId]` on the table `PaymentRecord` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `PaymentRecord_chargeId_key` ON `PaymentRecord`(`chargeId`);
